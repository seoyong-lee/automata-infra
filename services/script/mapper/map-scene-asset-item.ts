import { SceneJson } from "../../../types/render/scene-json";
import { alignSceneNarrationAndSubtitle } from "../../shared/lib/scene-text";

export const mapSceneAssetItem = (scene: SceneJson["scenes"][number]) => {
  const alignedScene = alignSceneNarrationAndSubtitle(scene);
  const hasNarration =
    !alignedScene.disableNarration && alignedScene.narration.trim().length > 0;
  return {
    visualType: alignedScene.videoPrompt ? "image+motion" : "image",
    durationSec: alignedScene.durationSec,
    narration: alignedScene.narration,
    disableNarration: alignedScene.disableNarration,
    subtitle: alignedScene.subtitle,
    storyBeat: alignedScene.storyBeat,
    visualNeed: alignedScene.visualNeed,
    imagePrompt: alignedScene.imagePrompt,
    videoPrompt: alignedScene.videoPrompt,
    voiceS3Key: hasNarration ? undefined : null,
    voiceSelectedCandidateId: hasNarration ? undefined : null,
    voiceDurationSec: hasNarration ? undefined : null,
    validationStatus: "PENDING",
  };
};
