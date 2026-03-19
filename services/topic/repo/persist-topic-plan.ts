import { putJsonToS3 } from "../../shared/lib/aws/runtime";
import { putJobMeta } from "../../shared/lib/store/video-jobs";
import { mapTopicPlanJobMeta } from "../mapper/map-topic-plan-job-meta";
import { TopicPlanResult } from "../usecase/create-topic-plan";

export const persistTopicPlan = async (
  result: TopicPlanResult,
): Promise<void> => {
  await putJsonToS3(result.topicS3Key, result);
  await putJobMeta(mapTopicPlanJobMeta(result));
};
