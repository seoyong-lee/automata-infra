import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { resolveSceneJsonS3KeyForAssetGeneration } from "../../../shared/lib/resolve-approved-pipeline-input";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type {
  SceneDefinition,
  SceneJson,
} from "../../../../../types/render/scene-json";
import type { StockSearchScope } from "../normalize/stock-search-scope";

export const loadStockSearchContext = async (
  jobId: string,
  scope: StockSearchScope,
): Promise<{ sceneJson: SceneJson; scenes: SceneDefinition[] }> => {
  const job = await getJobOrThrow(jobId);
  const sceneResolved = await resolveSceneJsonS3KeyForAssetGeneration(
    jobId,
    job,
  );
  if (!sceneResolved) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(
    sceneResolved.sceneJsonS3Key,
  );
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  let scenes = sceneJson.scenes;
  if (scope.targetSceneId !== undefined) {
    scenes = scenes.filter((scene) => scene.sceneId === scope.targetSceneId);
    if (scenes.length === 0) {
      throw new Error(`scene ${scope.targetSceneId} not found in sceneJson`);
    }
  }

  return {
    sceneJson,
    scenes,
  };
};
