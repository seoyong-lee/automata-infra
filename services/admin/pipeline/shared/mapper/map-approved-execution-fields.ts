import type { JobExecutionStageType } from "../../../../shared/lib/store/job-execution";

export const mapApprovedExecutionFields = (
  stageType: JobExecutionStageType,
  executionId: string,
): Record<string, unknown> => {
  if (stageType === "JOB_PLAN") {
    return {
      approvedPlanExecutionId: executionId,
    };
  }
  if (stageType === "SCENE_JSON") {
    return {
      approvedSceneExecutionId: executionId,
    };
  }
  if (stageType === "ASSET_GENERATION") {
    return {
      approvedAssetExecutionId: executionId,
    };
  }
  throw new Error("unknown pipeline stage");
};
