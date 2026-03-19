import { createHash } from "crypto";
import { getSecretJson, putJsonToS3 } from "../../aws/runtime";

type RunwayVideoSecret = {
  apiKey: string;
  endpoint?: string;
  model?: string;
};

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
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
