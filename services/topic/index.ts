import { Handler } from "aws-lambda";
import { persistTopicPlan } from "./repo/persist-topic-plan";
import { createTopicPlan, TopicPlanResult } from "./usecase/create-topic-plan";

type TopicEvent = {
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
  topicSeed?: {
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

const extractTopicSeed = (event: TopicEvent) => {
  const source =
    event.topicSeed ??
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

export const run: Handler<TopicEvent, TopicPlanResult> = async (event) => {
  const result = await createTopicPlan({
    jobId: event?.jobId,
    topicSeed: extractTopicSeed(event ?? {}),
  });
  await persistTopicPlan(result);

  return result;
};
