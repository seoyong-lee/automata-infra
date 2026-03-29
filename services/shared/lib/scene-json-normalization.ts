import { applyDefaultSceneStartTransitions } from "./scene-transition-defaults";
import { alignSceneJsonNarrationAndSubtitle } from "./scene-text";
import { applyDefaultSceneVisualMetadata } from "./scene-visual-needs";
import type { SceneJson } from "../../../types/render/scene-json";

export const normalizeSceneJson = (sceneJson: SceneJson): SceneJson => {
  return applyDefaultSceneVisualMetadata(
    applyDefaultSceneStartTransitions(
      alignSceneJsonNarrationAndSubtitle(sceneJson),
    ),
  );
};
