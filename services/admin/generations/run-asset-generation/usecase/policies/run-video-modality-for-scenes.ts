import { getBufferFromS3 } from "../../../../../shared/lib/aws/runtime";
import { getSceneAsset } from "../../../../../shared/lib/store/video-jobs";
import { generateSceneVideos } from "../../../../../video-generation/usecase/generate-scene-videos";
import { saveVideoAssets } from "../../../../../video-generation/repo/save-video-assets";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";

const toDataUri = (input: { buffer: Buffer; contentType?: string }): string => {
  return `data:${input.contentType ?? "image/png"};base64,${input.buffer.toString("base64")}`;
};

export const resolveTargetVideoDurationSec = (input: {
  scene: SceneDefinition;
  voiceDurationSec?: number;
}): number => {
  const plannedDurationSec =
    typeof input.scene.durationSec === "number" &&
    Number.isFinite(input.scene.durationSec)
      ? input.scene.durationSec
      : 0;
  const voiceDurationSec =
    typeof input.voiceDurationSec === "number" &&
    Number.isFinite(input.voiceDurationSec)
      ? input.voiceDurationSec
      : 0;
  return Math.max(0.1, plannedDurationSec, voiceDurationSec);
};

export const runVideoModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_VIDEO_SECRET_ID?.trim();
  const videoScenes = await Promise.all(
    scenes.map(async (scene) => {
      const sceneAsset = await getSceneAsset(jobId, scene.sceneId);
      const selectedImageS3Key =
        typeof sceneAsset?.imageS3Key === "string"
          ? sceneAsset.imageS3Key
          : undefined;
      const selectedImage =
        selectedImageS3Key !== undefined
          ? await getBufferFromS3(selectedImageS3Key)
          : null;
      const voiceDurationSec =
        typeof sceneAsset?.voiceDurationSec === "number"
          ? sceneAsset.voiceDurationSec
          : undefined;
      return {
        sceneId: scene.sceneId,
        videoPrompt: scene.videoPrompt,
        targetDurationSec: resolveTargetVideoDurationSec({
          scene,
          voiceDurationSec,
        }),
        selectedImageS3Key,
        selectedImageDataUri: selectedImage
          ? toDataUri(selectedImage)
          : undefined,
      };
    }),
  );
  const videoAssets = await generateSceneVideos({
    jobId,
    scenes: videoScenes,
    secretId: (bytePlusSecretId || process.env.RUNWAY_SECRET_ID) ?? "",
    provider: bytePlusSecretId ? "byteplus" : "runway",
  });
  await saveVideoAssets({
    jobId,
    scenes: videoScenes,
    videoAssets,
  });
};
