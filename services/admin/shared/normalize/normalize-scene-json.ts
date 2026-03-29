import { alignSceneJsonNarrationAndSubtitle } from "../../../shared/lib/scene-text";
import type { SceneJson } from "../../../../types/render/scene-json";

export const normalizeSceneJson = (sceneJson: SceneJson): SceneJson => {
  return alignSceneJsonNarrationAndSubtitle(sceneJson);
};
