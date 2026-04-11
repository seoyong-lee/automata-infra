import { randomUUID } from "crypto";

import { getSecretJson } from "../../aws/runtime";
import {
  buildBytePlusRequestMeta,
  getRequiredEndpoint,
  getRequiredQueryEndpoint,
  resolvePromptField,
  resolveRequestedBytePlusDurationSec,
  resolveVideoModel,
  type BytePlusVideoSecret,
} from "./byteplus-video-config";
import {
  completeBytePlusVideo,
  failBytePlusVideo,
  putMockVideo,
} from "./byteplus-video-persist";

export { resolveRequestedBytePlusDurationSec } from "./byteplus-video-config";

export const generateSceneBytePlusVideo = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  targetDurationSec?: number;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<BytePlusVideoSecret>(input.secretId);
  const candidateId = randomUUID();
  const createdAt = new Date().toISOString();
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}/${candidateId}.mp4`;
  const rawKey = `logs/${input.jobId}/provider/byteplus-video-scene-${input.sceneId}-${candidateId}.json`;

  if (!secret?.apiKey) {
    const resolvedDurationSec = resolveRequestedBytePlusDurationSec({
      secret: secret ?? { apiKey: "" },
      targetDurationSec: input.targetDurationSec,
    });
    return putMockVideo({
      videoKey,
      rawKey,
      prompt: input.prompt,
      targetDurationSec: input.targetDurationSec,
      resolvedDurationSec,
      candidateId,
      createdAt,
    });
  }

  const endpoint = getRequiredEndpoint(secret);
  const queryEndpointTemplate = getRequiredQueryEndpoint(secret);
  const model = resolveVideoModel(secret);
  const promptField = resolvePromptField(secret);
  const imageField = secret.imageField?.trim();
  const requestMeta = buildBytePlusRequestMeta({
    secret,
    targetDurationSec: input.targetDurationSec,
    selectedImageDataUri: input.selectedImageDataUri,
  });

  try {
    return await completeBytePlusVideo({
      secret: { ...secret, apiKey: secret.apiKey },
      endpoint,
      queryEndpointTemplate,
      videoKey,
      rawKey,
      model,
      promptField,
      imageField,
      prompt: input.prompt,
      targetDurationSec: input.targetDurationSec,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
      candidateId,
      createdAt,
    });
  } catch (error) {
    return failBytePlusVideo({
      rawKey,
      endpoint,
      queryEndpoint: queryEndpointTemplate,
      model,
      promptField,
      imageField,
      targetDurationSec: input.targetDurationSec,
      resolvedDurationSec: resolveRequestedBytePlusDurationSec({
        secret,
        targetDurationSec: input.targetDurationSec,
      }),
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
      requestMeta,
      prompt: input.prompt,
      error,
    });
  }
};
