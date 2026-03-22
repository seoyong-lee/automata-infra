import { SceneJson } from "../../../types/render/scene-json";

export const mapSceneAssetItem = (scene: SceneJson["scenes"][number]) => {
  const hasNarration = scene.narration.trim().length > 0;
  return {
    visualType: scene.videoPrompt ? "image+motion" : "image",
    durationSec: scene.durationSec,
    narration: scene.narration,
    subtitle: scene.subtitle,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    voiceS3Key: hasNarration ? undefined : null,
    voiceSelectedCandidateId: hasNarration ? undefined : null,
    voiceDurationSec: hasNarration ? undefined : null,
    validationStatus: "PENDING",
  };
};
