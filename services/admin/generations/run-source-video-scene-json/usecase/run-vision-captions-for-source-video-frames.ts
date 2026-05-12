import { getBufferFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import type { SourceVideoFrameExtractStoredResult } from "../../../../shared/lib/contracts/source-video-insight";
import {
  assertGeminiVisionSecretConfigured,
  resolveEffectiveSourceVideoVisionProvider,
  type SourceVideoVisionProvider,
} from "../../../../shared/lib/contracts/source-video-vision";
import { parseJsonFromLlmText } from "../../../../shared/lib/llm/parse-json-from-llm-text";
import { invokeBedrockAnthropicWithVisionJpegs } from "../../../../shared/lib/providers/llm/bedrock-vision";
import { invokeGeminiVisionForKeyframeCaptions } from "../../../../shared/lib/providers/llm/gemini-vision";
import { getLlmStepSettings } from "../../../../shared/lib/store/llm-config";
import { sourceVideoVisionCaptionsSchema } from "../../../../shared/lib/contracts/source-video-scene-json";
import { badUserInput } from "../../../shared/errors";

const VISION_CAPTIONS_LOG_KEY = (jobId: string) =>
  `logs/${jobId}/source-video-insight/vision-captions-for-scene-json.json`;

const loadJpegBase64Parts = async (
  frames: SourceVideoFrameExtractStoredResult["frames"],
): Promise<string[]> => {
  const jpegBase64Parts: string[] = [];
  for (const frame of frames) {
    const key = frame.imageS3Key?.trim();
    if (!key) {
      throw new Error(
        "frame JPEG S3 keys missing (already purged?); re-run runSourceVideoFrameExtract or use skipVision: true",
      );
    }
    const got = await getBufferFromS3(key);
    if (!got?.buffer?.length) {
      throw new Error(`missing frame JPEG at ${key}`);
    }
    jpegBase64Parts.push(got.buffer.toString("base64"));
  }
  return jpegBase64Parts;
};

const assertGeminiConfiguredOrThrow = (): void => {
  try {
    assertGeminiVisionSecretConfigured();
  } catch (e) {
    throw badUserInput(
      e instanceof Error ? e.message : "Gemini vision is not configured",
    );
  }
};

const buildVisionUserPrompt = (
  frames: SourceVideoFrameExtractStoredResult["frames"],
  targetLanguage: string,
): string => {
  const offsets = frames.map((f) => f.offsetSec).join(", ");
  return [
    `You are given ${frames.length} JPEG frames from one source video, in chronological order.`,
    `Approximate timestamps in seconds: ${offsets}.`,
    `Return ONLY valid JSON (no markdown, no prose) with this exact shape: an array of ${frames.length} objects:`,
    `[{"offsetSec": number, "caption": "concise visible description in ${targetLanguage}"}, ...]`,
    "Each object must match the frame at the same index (first object = first image).",
    "offsetSec must copy the timestamp from the list above for that index.",
  ].join("\n");
};

const VISION_SYSTEM_PROMPT =
  "You describe video keyframes for a downstream short-form script writer. Be literal about what is visible.";

export const runVisionCaptionsForSourceVideoFrames = async (input: {
  jobId: string;
  targetLanguage: string;
  extract: SourceVideoFrameExtractStoredResult;
  visionProviderOverride?: SourceVideoVisionProvider;
}): Promise<unknown[]> => {
  const { jobId, targetLanguage, extract, visionProviderOverride } = input;
  const frames = extract.frames;
  const jpegBase64Parts = await loadJpegBase64Parts(frames);

  const visionBackend = resolveEffectiveSourceVideoVisionProvider({
    override: visionProviderOverride,
  });
  if (visionBackend === "GEMINI") {
    assertGeminiConfiguredOrThrow();
  }

  const settings = await getLlmStepSettings("scene-json");
  const userText = buildVisionUserPrompt(frames, targetLanguage);

  const { text, modelId, logS3Key } =
    visionBackend === "GEMINI"
      ? await invokeGeminiVisionForKeyframeCaptions({
          jobId,
          logStepKey: "source-video-scene-json-vision",
          systemInstruction: VISION_SYSTEM_PROMPT,
          userText,
          jpegBase64Parts,
          temperature: 0.2,
          maxOutputTokens: 4096,
        })
      : await invokeBedrockAnthropicWithVisionJpegs({
          jobId,
          logStepKey: "source-video-scene-json-vision",
          modelId: settings.config.model,
          secretIdEnvVar: settings.config.secretIdEnvVar,
          systemPrompt: VISION_SYSTEM_PROMPT,
          userText,
          images: jpegBase64Parts.map((base64) => ({ base64 })),
          temperature: 0.2,
          maxOutputTokens: 4096,
        });

  const parsed = parseJsonFromLlmText(text);
  const rows = sourceVideoVisionCaptionsSchema.parse(parsed);
  if (rows.length !== frames.length) {
    throw new Error(
      `vision caption count ${rows.length} does not match frame count ${frames.length}`,
    );
  }
  const normalized = rows.map((row, i) => ({
    offsetSec: frames[i].offsetSec,
    caption: row.caption,
  }));

  await putJsonToS3(VISION_CAPTIONS_LOG_KEY(jobId), {
    visionBackend,
    modelId,
    visionLogS3Key: logS3Key,
    captions: normalized,
  });

  return normalized;
};
