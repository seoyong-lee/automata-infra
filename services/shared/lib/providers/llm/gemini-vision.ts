import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry } from "../http/retry";
import {
  assertGeminiVisionSecretConfigured,
  DEFAULT_GEMINI_VISION_MODEL,
} from "../../contracts/source-video-vision";

type GeminiVisionSecret = {
  apiKey: string;
  /** 기본 `gemini-2.5-flash-lite` — 대량 키프레임 캡션에 비용 대비 유리 */
  model?: string;
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

const buildLogKey = (jobId: string, stepKey: string): string =>
  `logs/${jobId}/provider/gemini-vision-${stepKey}.json`;

const extractTextFromGeminiResponse = (
  payload: GeminiGenerateContentResponse,
): string | null => {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  const text = parts
    .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
  return text.length > 0 ? text : null;
};

const loadGeminiCredentials = async (
  secretId: string,
): Promise<{ model: string; apiKey: string }> => {
  const secret = await getSecretJson<GeminiVisionSecret>(secretId);
  if (!secret?.apiKey?.trim()) {
    throw new Error("Gemini vision secret missing apiKey");
  }
  const model = (secret.model ?? DEFAULT_GEMINI_VISION_MODEL).trim();
  return { model, apiKey: secret.apiKey.trim() };
};

const buildGeminiUrl = (model: string, apiKey: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

const buildGeminiBody = (input: {
  systemInstruction: string;
  userText: string;
  jpegBase64Parts: string[];
  temperature: number;
  maxOutputTokens: number;
}) => {
  const userParts: GeminiPart[] = [
    { text: input.userText },
    ...input.jpegBase64Parts.map(
      (data): GeminiPart => ({
        inlineData: { mimeType: "image/jpeg", data },
      }),
    ),
  ];
  return {
    systemInstruction: {
      parts: [{ text: input.systemInstruction }],
    },
    contents: [{ role: "user", parts: userParts }],
    generationConfig: {
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    },
  };
};

const requireGeminiText = (
  payload: GeminiGenerateContentResponse,
): string => {
  if (payload.error?.message) {
    throw new Error(`Gemini vision: ${payload.error.message}`);
  }
  const text = extractTextFromGeminiResponse(payload);
  if (!text) {
    const reason = payload.candidates?.[0]?.finishReason ?? "no text";
    throw new Error(`Gemini vision returned no text (finish: ${reason})`);
  }
  return text;
};

/**
 * Google AI Gemini `generateContent` — JPEG base64 멀티 입력.
 * Flash-Lite 기본으로 키프레임 설명 비용을 최소화한다.
 */
export const invokeGeminiVisionForKeyframeCaptions = async (input: {
  jobId: string;
  logStepKey: string;
  systemInstruction: string;
  userText: string;
  jpegBase64Parts: string[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; modelId: string; logS3Key: string }> => {
  const secretId = assertGeminiVisionSecretConfigured();
  const { model, apiKey } = await loadGeminiCredentials(secretId);
  const url = buildGeminiUrl(model, apiKey);
  const temperature = input.temperature ?? 0.2;
  const maxOutputTokens = input.maxOutputTokens ?? 4096;
  const body = buildGeminiBody({
    systemInstruction: input.systemInstruction,
    userText: input.userText,
    jpegBase64Parts: input.jpegBase64Parts,
    temperature,
    maxOutputTokens,
  });

  const payload = await fetchJsonWithRetry<GeminiGenerateContentResponse>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { maxAttempts: 3 },
  );

  const text = requireGeminiText(payload);
  const logS3Key = buildLogKey(input.jobId, input.logStepKey);
  await putJsonToS3(logS3Key, {
    provider: "gemini-vision",
    model,
    imageCount: input.jpegBase64Parts.length,
    requestMeta: {
      systemLen: input.systemInstruction.length,
      userTextLen: input.userText.length,
    },
    responseSummary: {
      finishReason: payload.candidates?.[0]?.finishReason,
      textPreview: text.slice(0, 2000),
    },
  });

  return { text, modelId: model, logS3Key };
};
