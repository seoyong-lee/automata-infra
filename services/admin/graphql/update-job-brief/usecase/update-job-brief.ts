import { saveJobBrief } from "../../shared/repo/job-draft-store";
import type { JobBriefDto } from "../../shared/types";

export const updateAdminJobBrief = async (input: {
  jobId: string;
  jobBrief: JobBriefDto;
}): Promise<JobBriefDto> => {
  await saveJobBrief({
    jobId: input.jobId,
    jobBrief: input.jobBrief,
    status: "DRAFT",
  });
  return input.jobBrief;
};
