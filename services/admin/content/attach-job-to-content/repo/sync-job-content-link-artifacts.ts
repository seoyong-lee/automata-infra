import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import type { JobPlanResult } from "../../../../plan/usecase/create-job-plan";
import type { ContentBriefDto, JobBriefDto } from "../../../shared/types";
import type { AttachJobToContentContext } from "./load-attach-job-context";

const updateJsonArtifact = async <T>(
  s3Key: string | undefined,
  map: (value: T) => T,
): Promise<void> => {
  if (!s3Key) {
    return;
  }
  const current = await getJsonFromS3<T>(s3Key);
  if (!current) {
    return;
  }
  await putJsonToS3(s3Key, map(current));
};

export const syncJobContentLinkArtifacts = async (
  input: AttachJobToContentContext,
): Promise<void> => {
  await updateJsonArtifact<JobBriefDto>(input.job.jobBriefS3Key, (jobBrief) => ({
    ...jobBrief,
    contentId: input.parent.contentId,
  }));

  await updateJsonArtifact<ContentBriefDto>(
    input.job.contentBriefS3Key,
    (contentBrief) => ({
      ...contentBrief,
      contentId: input.parent.contentId,
      seed: {
        ...contentBrief.seed,
        audience: input.parent.label,
      },
    }),
  );

  await updateJsonArtifact<JobPlanResult>(input.job.jobPlanS3Key, (jobPlan) => ({
    ...jobPlan,
    contentId: input.parent.contentId,
  }));
};
