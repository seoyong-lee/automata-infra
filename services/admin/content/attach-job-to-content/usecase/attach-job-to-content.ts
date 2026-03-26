import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  getContentMeta,
  getJobMeta,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import type { JobPlanResult } from "../../../../plan/usecase/create-job-plan";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { badUserInput, notFound } from "../../../shared/errors";
import type {
  AttachJobToContentInputDto,
  ContentBriefDto,
  JobBriefDto,
} from "../../../shared/types";

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
    throw badUserInput(
      "이미 채널에 연결된 제작 아이템은 다른 채널로 옮기거나 중복 연결할 수 없습니다.",
    );
  }

  if (job.jobBriefS3Key) {
    const jobBrief = await getJsonFromS3<JobBriefDto>(job.jobBriefS3Key);
    if (jobBrief) {
      await putJsonToS3(job.jobBriefS3Key, {
        ...jobBrief,
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

  if (job.jobPlanS3Key) {
    const jobPlan = await getJsonFromS3<JobPlanResult>(job.jobPlanS3Key);
    if (jobPlan) {
      await putJsonToS3(job.jobPlanS3Key, {
        ...jobPlan,
        contentId: parent.contentId,
      });
    }
  }

  await updateJobMeta(job.jobId, { contentId: parent.contentId });

  const updated = await getJobOrThrow(job.jobId);
  return mapJobMetaToAdminJob(updated);
};
