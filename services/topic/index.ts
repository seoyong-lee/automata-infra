import { Handler } from "aws-lambda";
import { persistTopicPlan } from "./repo/persist-topic-plan";
import { createTopicPlan, TopicPlanResult } from "./usecase/create-topic-plan";

type TopicEvent = {
  jobId?: string;
  topicSeed?: {
    channelId?: string;
    targetLanguage?: string;
    titleIdea?: string;
    targetDurationSec?: number;
    stylePreset?: string;
  };
  channelId?: string;
  targetLanguage?: string;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
};

const extractTopicSeed = (event: TopicEvent) => {
  const source = event.topicSeed ?? event;
  return {
    channelId: source.channelId,
    targetLanguage: source.targetLanguage,
    titleIdea: source.titleIdea,
    targetDurationSec: source.targetDurationSec,
    stylePreset: source.stylePreset,
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
