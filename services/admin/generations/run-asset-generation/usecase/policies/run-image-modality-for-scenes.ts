import { generateSceneImages } from "../../../../../image/usecase/generate-scene-images";
import { saveImageAssets } from "../../../../../image/repo/save-image-assets";
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
  const imageScenes = scenes.map((scene) => ({
    sceneId: scene.sceneId,
    imagePrompt: scene.imagePrompt,
  }));
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
    scenes: imageScenes,
    imageAssets,
    markStatus: false,
  });
};
