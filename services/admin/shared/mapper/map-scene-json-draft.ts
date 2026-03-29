import { normalizeSceneJson } from "../normalize/normalize-scene-json";
import type { SceneJsonDto, SceneJsonSceneDto } from "../types";
import type { SceneJson } from "../../../../types/render/scene-json";

const mapScene = (scene: SceneJson["scenes"][number]): SceneJsonSceneDto => {
  return {
    sceneId: scene.sceneId,
    durationSec: scene.durationSec,
    narration: scene.narration,
    disableNarration: scene.disableNarration,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    subtitle: scene.subtitle,
    bgmMood: scene.bgmMood,
    sfx: scene.sfx,
    storyBeat: scene.storyBeat,
    visualNeed: scene.visualNeed,
    startTransition: scene.startTransition,
  };
};

export const mapSceneJsonDraft = (sceneJson: SceneJson): SceneJsonDto => {
  const normalized = normalizeSceneJson(sceneJson);
  return {
    videoTitle: normalized.videoTitle,
    language: normalized.language,
    scenes: normalized.scenes.map(mapScene),
  };
};
