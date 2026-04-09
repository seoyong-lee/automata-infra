import { generateSceneImages } from "../../../../../image/usecase/generate-scene-images";
import { saveImageAssets } from "../../../../../image/repo/save-image-assets";
import { listSceneAssets } from "../../../../../shared/lib/store/video-jobs";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";
import type { AssetGenerationScope } from "../../normalize/asset-generation-scope";
import type { AssetGenerationPolicy } from "../../repo/load-asset-generation-policy";

export const runImageModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
  scope: AssetGenerationScope,
  policy?: AssetGenerationPolicy,
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_IMAGE_SECRET_ID?.trim();
  const openAiSecretId = process.env.OPENAI_SECRET_ID?.trim();
  const sceneAssetMap = new Map(
    (await listSceneAssets(jobId)).map((asset) => [asset.sceneId, asset]),
  );
  const isSingleTargetRun = scope.targetSceneId !== undefined;
  const selectedScenes = scenes.filter((scene) => {
    if (isSingleTargetRun) {
      return true;
    }
    const existing = sceneAssetMap.get(scene.sceneId);
    return !(
      typeof existing?.imageS3Key === "string" &&
      existing.imageS3Key.trim().length > 0
    );
  });
  const imageScenes = selectedScenes
    .filter((scene) => {
      return scene.imagePrompt.trim().length > 0;
    })
    .map((scene) => ({
      sceneId: scene.sceneId,
      imagePrompt: scene.imagePrompt,
    }));
  if (imageScenes.length === 0) {
    return;
  }
  /** `imageScenes`와 동일 순서·길이로 맞춰 `saveImageAssets` 인덱스와 어긋나지 않게 한다 */
  const scenesForPersistence = imageScenes
    .map((entry) => scenes.find((s) => s.sceneId === entry.sceneId))
    .filter((s): s is SceneDefinition => s !== undefined);
  const provider =
    scope.imageProvider ??
    policy?.preferredImageProvider ??
    (bytePlusSecretId ? "byteplus" : "openai");
  const secretId = provider === "byteplus" ? bytePlusSecretId : openAiSecretId;
  if (!secretId) {
    throw new Error(
      provider === "byteplus"
        ? "BYTEPLUS_IMAGE_SECRET_ID is not configured"
        : "OPENAI_SECRET_ID is not configured",
    );
  }
  const imageAssets = await generateSceneImages({
    jobId,
    scenes: imageScenes,
    secretId,
    provider,
  });
  await saveImageAssets({
    jobId,
    scenes: scenesForPersistence,
    imageAssets,
    markStatus: false,
  });
};
