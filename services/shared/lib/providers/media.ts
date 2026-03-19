import { createHash } from "crypto";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../aws/runtime";

type OpenAiImageSecret = {
  apiKey: string;
  model?: string;
  size?: string;
  endpoint?: string;
};

type RunwayVideoSecret = {
  apiKey: string;
  endpoint?: string;
  model?: string;
};

type ElevenLabsSecret = {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  endpoint?: string;
};

type ShotstackSecret = {
  apiKey: string;
  endpoint?: string;
};

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

const buildSvgPlaceholder = (label: string): string => {
  const escaped = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#f9fafb" font-size="28" font-family="Arial">AI Pipeline Placeholder</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="20" font-family="Arial">${escaped}</text></svg>`;
};

const putMockImage = async (
  imageKey: string,
  rawKey: string,
  prompt: string,
): Promise<Record<string, unknown>> => {
  const svg = buildSvgPlaceholder(prompt);
  await putBufferToS3(imageKey, svg, "image/svg+xml");
  await putJsonToS3(rawKey, {
    mocked: true,
    prompt,
    hash: hashPrompt(prompt),
  });

  return {
    provider: "mock",
    imageS3Key: imageKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(prompt),
    mocked: true,
  };
};

const persistResolvedImage = async (
  imageKey: string,
  image: { b64_json?: string; url?: string } | undefined,
  prompt: string,
): Promise<void> => {
  if (image?.b64_json) {
    await putBufferToS3(
      imageKey,
      Buffer.from(image.b64_json, "base64"),
      "image/png",
    );
    return;
  }

  if (image?.url) {
    const assetResponse = await fetch(image.url);
    const arrayBuffer = await assetResponse.arrayBuffer();
    await putBufferToS3(
      imageKey,
      Buffer.from(arrayBuffer),
      assetResponse.headers.get("content-type") ?? "image/png",
    );
    return;
  }

  const svg = buildSvgPlaceholder(prompt);
  await putBufferToS3(imageKey, svg, "image/svg+xml");
};

export const generateSceneImage = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<OpenAiImageSecret>(input.secretId);
  const imageKey = `assets/${input.jobId}/images/scene-${input.sceneId}.png`;
  const rawKey = `logs/${input.jobId}/provider/image-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    return putMockImage(imageKey, rawKey, input.prompt);
  }

  const endpoint =
    secret.endpoint ?? "https://api.openai.com/v1/images/generations";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: secret.model ?? "gpt-image-1",
      size: secret.size ?? "1024x1024",
      prompt: input.prompt,
    }),
  });

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: unknown;
  };
  await putJsonToS3(rawKey, payload);
  await persistResolvedImage(imageKey, payload.data?.[0], input.prompt);

  return {
    provider: "openai-image",
    imageS3Key: imageKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};

export const generateSceneVideo = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<RunwayVideoSecret>(input.secretId);
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}.json`;
  const rawKey = `logs/${input.jobId}/provider/video-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    const mocked = {
      mocked: true,
      prompt: input.prompt,
      clipManifest: true,
    };
    await putJsonToS3(videoKey, mocked);
    await putJsonToS3(rawKey, mocked);

    return {
      provider: "mock",
      videoClipS3Key: videoKey,
      providerLogS3Key: rawKey,
      promptHash: hashPrompt(input.prompt),
      mocked: true,
    };
  }

  const endpoint =
    secret.endpoint ?? "https://api.dev.runwayml.com/v1/video_generations";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret.apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: secret.model ?? "gen4_turbo",
      promptText: input.prompt,
    }),
  });

  const payload = await response.json();
  await putJsonToS3(rawKey, payload);
  await putJsonToS3(videoKey, payload);

  return {
    provider: "runway-video",
    videoClipS3Key: videoKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};

export const generateSceneVoice = async (input: {
  jobId: string;
  sceneId: number;
  text: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ElevenLabsSecret>(input.secretId);
  const audioKey = `assets/${input.jobId}/tts/scene-${input.sceneId}.mp3`;
  const rawKey = `logs/${input.jobId}/provider/tts-scene-${input.sceneId}.json`;

  if (!secret?.apiKey || !secret.voiceId) {
    await putBufferToS3(audioKey, input.text, "text/plain");
    await putJsonToS3(rawKey, { mocked: true, text: input.text });

    return {
      provider: "mock",
      voiceS3Key: audioKey,
      providerLogS3Key: rawKey,
      mocked: true,
    };
  }

  const endpoint =
    secret.endpoint ??
    `https://api.elevenlabs.io/v1/text-to-speech/${secret.voiceId}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": secret.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: secret.modelId ?? "eleven_multilingual_v2",
    }),
  });

  const arrayBuffer = await response.arrayBuffer();
  await putBufferToS3(audioKey, Buffer.from(arrayBuffer), "audio/mpeg");
  await putJsonToS3(rawKey, {
    status: response.status,
    voiceId: secret.voiceId,
    bytes: arrayBuffer.byteLength,
  });

  return {
    provider: "elevenlabs-tts",
    voiceS3Key: audioKey,
    providerLogS3Key: rawKey,
    mocked: false,
  };
};

export const composeWithShotstack = async (input: {
  jobId: string;
  renderPlan: Record<string, unknown>;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ShotstackSecret>(input.secretId);
  const rawKey = `logs/${input.jobId}/composition/shotstack-request.json`;

  if (!secret?.apiKey) {
    await putJsonToS3(rawKey, { mocked: true, renderPlan: input.renderPlan });
    return {
      provider: "mock",
      mocked: true,
      responseLogS3Key: rawKey,
      finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
      thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
      previewS3Key: `previews/${input.jobId}/preview.mp4`,
    };
  }

  const endpoint = secret.endpoint ?? "https://api.shotstack.io/stage/render";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": secret.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.renderPlan),
  });

  const payload = await response.json();
  await putJsonToS3(rawKey, payload);

  return {
    provider: "shotstack",
    mocked: false,
    responseLogS3Key: rawKey,
    providerRenderId:
      (payload as { response?: { id?: string } }).response?.id ?? null,
    finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
    thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
    previewS3Key: `previews/${input.jobId}/preview.mp4`,
  };
};
