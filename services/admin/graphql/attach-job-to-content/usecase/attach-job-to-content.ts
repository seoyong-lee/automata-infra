import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  getContentMeta,
  getJobMeta,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import type { TopicPlanResult } from "../../../../topic/usecase/create-topic-plan";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { badUserInput, notFound } from "../../shared/errors";
import type {
  AttachJobToContentInputDto,
  ContentBriefDto,
  TopicSeedDto,
} from "../../shared/types";

const isUnattached = (contentId: string | undefined): boolean => {
  return contentId === undefined || contentId === ADMIN_UNASSIGNED_CONTENT_ID;
};

export const attachAdminJobToContent = async (
  input: AttachJobToContentInputDto,
) => {
  if (input.contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("cannot attach to reserved content id");
  }

  const parent = await getContentMeta(input.contentId);
  if (!parent) {
    throw notFound("content not found");
  }

  const job = await getJobMeta(input.jobId);
  if (!job) {
    throw notFound("job not found");
  }

  if (!isUnattached(job.contentId)) {
    throw badUserInput("job is already attached to a content");
  }

  if (job.topicSeedS3Key) {
    const seed = await getJsonFromS3<TopicSeedDto>(job.topicSeedS3Key);
    if (seed) {
      await putJsonToS3(job.topicSeedS3Key, {
        ...seed,
        contentId: parent.contentId,
      });
    }
  }

  if (job.contentBriefS3Key) {
    const brief = await getJsonFromS3<ContentBriefDto>(job.contentBriefS3Key);
    if (brief) {
      await putJsonToS3(job.contentBriefS3Key, {
        ...brief,
        contentId: parent.contentId,
        seed: {
          ...brief.seed,
          audience: parent.label,
        },
      });
    }
  }

  if (job.topicS3Key) {
    const plan = await getJsonFromS3<TopicPlanResult>(job.topicS3Key);
    if (plan) {
      await putJsonToS3(job.topicS3Key, {
        ...plan,
        contentId: parent.contentId,
      });
    }
  }

  await updateJobMeta(job.jobId, { contentId: parent.contentId });

  const updated = await getJobOrThrow(job.jobId);
  return mapJobMetaToAdminJob(updated);
};
