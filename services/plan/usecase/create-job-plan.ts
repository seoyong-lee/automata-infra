import { resolvePlanContext, resolveJobId } from "./create-job-plan-context";
import { buildJobPlanResult } from "./create-job-plan-result";
import {
  generateJobPlanSeed,
  getSeedFromOverrides,
  hasCompleteBrief,
} from "./create-job-plan-seed";
import type {
  CreateJobPlanDeps,
  JobPlanResult,
} from "./create-job-plan-types";

export type { JobPlanResult } from "./create-job-plan-types";

export const createJobPlan = async (
  deps: CreateJobPlanDeps = {},
): Promise<JobPlanResult> => {
  const createdAt = (deps.now ?? (() => new Date().toISOString()))();
  const jobId = resolveJobId(createdAt, deps.jobId, deps.jobBrief);
  const { contentId, targetLanguage } = resolvePlanContext(deps);
  const seed = hasCompleteBrief(deps.jobBrief)
    ? getSeedFromOverrides(deps.jobBrief)
    : await generateJobPlanSeed({
        generateStructuredData: deps.generateStructuredData,
        jobId,
        contentId,
        targetLanguage,
        contentType: deps.jobBrief?.contentType,
        variant: deps.jobBrief?.variant,
        presetId: deps.jobBrief?.presetId,
        resolvedPolicy: deps.jobBrief?.resolvedPolicy,
        creativeBrief: deps.jobBrief?.creativeBrief,
      });

  return buildJobPlanResult({
    jobId,
    createdAt,
    contentId,
    targetLanguage,
    jobBrief: deps.jobBrief,
    seed,
  });
};
