import { upsertSceneAsset } from "../../shared/lib/store/video-jobs";
import { SceneJson } from "../../../types/render/scene-json";
import {
  mapSceneAssetItem,
  mapSceneAssetItemForSceneJsonUpdate,
} from "../mapper/map-scene-asset-item";

export const persistSceneAssets = async (
  jobId: string,
  sceneJson: SceneJson,
): Promise<void> => {
  for (const scene of sceneJson.scenes) {
    await upsertSceneAsset(jobId, scene.sceneId, mapSceneAssetItem(scene));
  }
};

export const persistSceneAssetsAfterSceneJsonEdit = async (
  jobId: string,
  sceneJson: SceneJson,
): Promise<void> => {
  for (const scene of sceneJson.scenes) {
    await upsertSceneAsset(
      jobId,
      scene.sceneId,
      mapSceneAssetItemForSceneJsonUpdate(scene),
    );
  }
};
