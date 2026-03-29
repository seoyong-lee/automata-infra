import type {
  JobBriefOverrides,
  JobPlanResult,
  JobPlanSeed,
} from "./create-job-plan-types";

const mergeCoalescedSeed = (
  seed: JobPlanSeed,
  jobBrief?: JobBriefOverrides,
): Pick<JobPlanSeed, "targetDurationSec" | "titleIdea" | "stylePreset"> => {
  return {
    targetDurationSec: jobBrief?.targetDurationSec ?? seed.targetDurationSec,
    titleIdea: jobBrief?.titleIdea ?? seed.titleIdea,
    stylePreset: jobBrief?.stylePreset ?? seed.stylePreset,
  };
};

const jobBriefCreativeBrief = (
  jobBrief?: JobBriefOverrides,
): string | undefined => {
  const trimmed = jobBrief?.creativeBrief?.trim();
  return trimmed ? trimmed : undefined;
};

const jobBriefOptionalMeta = (jobBrief?: JobBriefOverrides) => {
  return {
    contentType: jobBrief?.contentType,
    variant: jobBrief?.variant,
    ...(jobBrief?.presetId ? { presetId: jobBrief.presetId } : {}),
    ...(jobBrief?.presetSnapshot
      ? { presetSnapshot: jobBrief.presetSnapshot }
      : {}),
    ...(jobBrief?.resolvedPolicy
      ? { resolvedPolicy: jobBrief.resolvedPolicy }
      : {}),
    autoPublish: jobBrief?.autoPublish,
    publishAt: jobBrief?.publishAt,
  };
};

export const buildJobPlanResult = (input: {
  jobId: string;
  createdAt: string;
  contentId: string;
  targetLanguage: string;
  jobBrief?: JobBriefOverrides;
  seed: JobPlanSeed;
}): JobPlanResult => {
  const merged = mergeCoalescedSeed(input.seed, input.jobBrief);
  const meta = jobBriefOptionalMeta(input.jobBrief);
  return {
    jobId: input.jobId,
    contentId: input.contentId,
    targetLanguage: input.targetLanguage,
    ...merged,
    creativeBrief: jobBriefCreativeBrief(input.jobBrief),
    ...meta,
    status: "PLANNED",
    jobPlanS3Key: `plans/${input.jobId}/job-plan.json`,
    createdAt: input.createdAt,
  };
};
