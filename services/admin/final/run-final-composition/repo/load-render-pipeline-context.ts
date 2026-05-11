import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { listSceneAssets } from "../../../../shared/lib/store/video-jobs";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { SceneJson } from "../../../../../types/render/scene-json";

export type RenderPipelineContext = {
  jobId: string;
  sceneJson: SceneJson;
  imageAssets: Array<{ sceneId: number; imageS3Key?: string }>;
  videoAssets: Array<{ sceneId: number; videoClipS3Key?: string }>;
  voiceAssets: Array<{
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
    voiceAlignmentS3Key?: string;
  }>;
  backgroundMusicS3Key?: string;
};

export const loadRenderPipelineContext = async (
  jobId: string,
): Promise<RenderPipelineContext> => {
  const job = await getJobOrThrow(jobId);
  const sceneJsonS3Key = job.sceneJsonS3Key?.trim();
  if (!sceneJsonS3Key) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  const sceneAssets = await listSceneAssets(jobId);

  return {
    jobId,
    sceneJson,
    imageAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      imageS3Key:
        typeof asset.imageS3Key === "string" ? asset.imageS3Key : undefined,
    })),
    videoAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      videoClipS3Key:
        typeof asset.videoClipS3Key === "string"
          ? asset.videoClipS3Key
          : undefined,
    })),
    voiceAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      voiceS3Key:
        typeof asset.voiceS3Key === "string" ? asset.voiceS3Key : undefined,
      voiceDurationSec:
        typeof asset.voiceDurationSec === "number"
          ? asset.voiceDurationSec
          : undefined,
      voiceAlignmentS3Key:
        typeof asset.voiceAlignmentS3Key === "string"
          ? asset.voiceAlignmentS3Key
          : undefined,
    })),
    backgroundMusicS3Key:
      typeof job.backgroundMusicS3Key === "string"
        ? job.backgroundMusicS3Key
        : undefined,
  };
};
