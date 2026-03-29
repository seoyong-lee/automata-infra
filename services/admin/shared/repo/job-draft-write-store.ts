import { putJsonToS3 } from "../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../shared/lib/store/video-jobs";
import {
  mapContentBriefMetaUpdate,
  mapJobBriefMetaUpdate,
  mapJobPlanMetaUpdate,
} from "../mapper/map-job-brief-meta-update";
import type { ContentBriefDto, JobBriefDto } from "../types";
import {
  buildContentBriefKey,
  buildJobBriefKey,
  buildJobPlanKey,
} from "./job-draft-keys";

export const saveJobBrief = async (input: {
  jobId: string;
  jobBrief: JobBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildJobBriefKey(input.jobId);
  await putJsonToS3(key, input.jobBrief);
  await updateJobMeta(
    input.jobId,
    {
      ...mapJobBriefMetaUpdate(input.jobBrief),
      jobBriefS3Key: key,
    },
    input.status,
  );
  return key;
};

export const saveContentBrief = async (input: {
  jobId: string;
  contentBrief: ContentBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildContentBriefKey(input.jobId);
  await putJsonToS3(key, input.contentBrief);
  await updateJobMeta(
    input.jobId,
    {
      ...mapContentBriefMetaUpdate(input.contentBrief),
      contentBriefS3Key: key,
    },
    input.status,
  );
  return key;
};

export const saveJobPlan = async (input: {
  jobId: string;
  jobPlan: JobBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildJobPlanKey(input.jobId);
  await putJsonToS3(key, input.jobPlan);
  await updateJobMeta(
    input.jobId,
    {
      ...mapJobPlanMetaUpdate(input.jobPlan),
      jobPlanS3Key: key,
    },
    input.status,
  );
  return key;
};
