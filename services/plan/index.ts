import { Handler } from "aws-lambda";
import { persistJobPlan } from "./repo/persist-job-plan";
import { createJobPlan, JobPlanResult } from "./usecase/create-job-plan";

type PlanEvent = {
  jobId?: string;
  contentBrief?: {
    contentType?: string;
    variant?: string;
    contentId?: string;
    language?: string;
    targetDurationSec?: number;
    titleIdea?: string;
    stylePreset?: string;
    autoPublish?: boolean;
    publishAt?: string;
  };
  jobBrief?: {
    contentId?: string;
    targetLanguage?: string;
    contentType?: string;
    variant?: string;
    titleIdea?: string;
    targetDurationSec?: number;
    stylePreset?: string;
    autoPublish?: boolean;
    publishAt?: string;
  };
  contentId?: string;
  targetLanguage?: string;
  contentType?: string;
  variant?: string;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

const extractJobBrief = (event: PlanEvent) => {
  const source =
    event.jobBrief ??
    (event.contentBrief
      ? {
          contentId: event.contentBrief.contentId,
          targetLanguage: event.contentBrief.language,
          contentType: event.contentBrief.contentType,
          variant: event.contentBrief.variant,
          titleIdea: event.contentBrief.titleIdea,
          targetDurationSec: event.contentBrief.targetDurationSec,
          stylePreset: event.contentBrief.stylePreset,
          autoPublish: event.contentBrief.autoPublish,
          publishAt: event.contentBrief.publishAt,
        }
      : event);
  return {
    contentId: source.contentId,
    targetLanguage: source.targetLanguage,
    contentType: source.contentType,
    variant: source.variant,
    titleIdea: source.titleIdea,
    targetDurationSec: source.targetDurationSec,
    stylePreset: source.stylePreset,
    autoPublish: source.autoPublish,
    publishAt: source.publishAt,
  };
};

export const run: Handler<PlanEvent, JobPlanResult> = async (event) => {
  const result = await createJobPlan({
    jobId: event?.jobId,
    jobBrief: extractJobBrief(event ?? {}),
  });
  await persistJobPlan(result);

  return result;
};
