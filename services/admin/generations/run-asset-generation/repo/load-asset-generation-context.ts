import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { resolveSceneJsonS3KeyForAssetGeneration } from "../../../shared/lib/resolve-approved-pipeline-input";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type {
  SceneDefinition,
  SceneJson,
} from "../../../../../types/render/scene-json";
import type { AssetGenerationScope } from "../normalize/asset-generation-scope";

export type AssetGenerationContext = {
  sceneJson: SceneJson;
  scenes: SceneDefinition[];
  sceneJsonS3Key: string;
};

export const resolveAssetGenerationInputSnapshotId = async (
  jobId: string,
): Promise<string> => {
  const job = await getJobOrThrow(jobId);
  const sceneResolved = await resolveSceneJsonS3KeyForAssetGeneration(
    jobId,
    job,
  );
  if (!sceneResolved) {
    throw new Error("scene json not found");
  }
  return sceneResolved.sceneJsonS3Key;
};

export const loadAssetGenerationContext = async (
  jobId: string,
  scope: AssetGenerationScope,
): Promise<AssetGenerationContext> => {
  const sceneJsonS3Key = await resolveAssetGenerationInputSnapshotId(jobId);
  const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
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
    sceneJsonS3Key,
  };
};
