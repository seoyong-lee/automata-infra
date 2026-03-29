import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import type { AssetGenerationScope } from "../normalize/asset-generation-scope";

export type AssetGenerationPolicy = {
  allowImage: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  preferredImageProvider?: "openai" | "byteplus";
};

const resolvePreferredImageProvider = (
  value?: string,
): "openai" | "byteplus" | undefined => {
  if (value === "openai") {
    return "openai";
  }
  if (value === "byteplus") {
    return "byteplus";
  }
  return undefined;
};

export const loadAssetGenerationPolicy = async (
  jobId: string,
): Promise<AssetGenerationPolicy> => {
  const job = await getJobOrThrow(jobId);
  const [jobBrief, contentBrief] = await Promise.all([
    getStoredJobBrief(job),
    getStoredContentBrief(job),
  ]);
  const resolvedPolicy =
    jobBrief?.resolvedPolicy ?? contentBrief?.resolvedPolicy ?? undefined;
  if (!resolvedPolicy) {
    return {
      allowImage: true,
      allowVoice: true,
      allowVideo: true,
    };
  }

  return {
    allowImage:
      resolvedPolicy.capabilities.supportsAiImage ||
      resolvedPolicy.capabilities.supportsStockImage,
    allowVoice: resolvedPolicy.capabilities.voiceMode !== "disabled",
    allowVideo:
      resolvedPolicy.capabilities.supportsAiVideo ||
      resolvedPolicy.capabilities.supportsStockVideo,
    preferredImageProvider: resolvePreferredImageProvider(
      resolvedPolicy.preferredImageProvider,
    ),
  };
};

export const assertModalityAllowed = (
  scope: AssetGenerationScope,
  policy: AssetGenerationPolicy,
): void => {
  if (scope.modality === "image" && !policy.allowImage) {
    throw new Error("image generation is disabled for this preset");
  }
  if (scope.modality === "voice" && !policy.allowVoice) {
    throw new Error("voice generation is disabled for this preset");
  }
  if (scope.modality === "video" && !policy.allowVideo) {
    throw new Error("video generation is disabled for this preset");
  }
};
