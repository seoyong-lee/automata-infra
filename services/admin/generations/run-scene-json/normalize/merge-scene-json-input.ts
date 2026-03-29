import type { JobPlanResult } from "../../../../plan/usecase/create-job-plan";
import type { JobBriefDto } from "../../../shared/types";

export const mergeSceneJsonInput = (
  jobPlan: JobPlanResult,
  jobBrief?: JobBriefDto,
): JobPlanResult => {
  return {
    ...jobPlan,
    creativeBrief: jobBrief?.creativeBrief ?? jobPlan.creativeBrief,
    presetId: jobBrief?.presetId ?? jobPlan.presetId,
    presetSnapshot: jobBrief?.presetSnapshot ?? jobPlan.presetSnapshot,
    resolvedPolicy: jobBrief?.resolvedPolicy ?? jobPlan.resolvedPolicy,
  };
};
