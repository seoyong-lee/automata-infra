import { normalizeSceneJson as normalizeSharedSceneJson } from "../../../shared/lib/scene-json-normalization";
import type { SceneJson } from "../../../../types/render/scene-json";

export const normalizeSceneJson = (sceneJson: SceneJson): SceneJson => {
  return normalizeSharedSceneJson(sceneJson);
};
