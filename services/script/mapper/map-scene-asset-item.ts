import { SceneJson } from "../../../types/render/scene-json";

export const mapSceneAssetItem = (scene: SceneJson["scenes"][number]) => {
  return {
    visualType: scene.videoPrompt ? "image+motion" : "image",
    durationSec: scene.durationSec,
    narration: scene.narration,
    subtitle: scene.subtitle,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    validationStatus: "PENDING",
  };
};
