import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { parseTopicSeedInput } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { createTopicPlan } from "../../../../topic/usecase/create-topic-plan";
import {
  getJobOrThrow,
  getStoredTopicSeed,
} from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";

export const runAdminTopicPlan = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const topicSeed = await getStoredTopicSeed(job);
  if (!topicSeed) {
    throw new Error("topic seed not found");
  }
  const validatedTopicSeed = parseTopicSeedInput(topicSeed);

  await updateJobMeta(jobId, {}, "PLANNING");
  const planned = await createTopicPlan({
    jobId,
    topicSeed: validatedTopicSeed,
  });
  await putJsonToS3(planned.topicS3Key, planned);
  await updateJobMeta(
    jobId,
    {
      topicS3Key: planned.topicS3Key,
      channelId: planned.channelId,
      language: planned.targetLanguage,
      targetDurationSec: planned.targetDurationSec,
      videoTitle: planned.titleIdea,
    },
    "PLANNED",
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};
