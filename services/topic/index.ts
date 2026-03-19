import { Handler } from "aws-lambda";
import { persistTopicPlan } from "./repo/persist-topic-plan";
import { createTopicPlan, TopicPlanResult } from "./usecase/create-topic-plan";

export const run: Handler<unknown, TopicPlanResult> = async () => {
  const result = await createTopicPlan();
  await persistTopicPlan(result);

  return result;
};
