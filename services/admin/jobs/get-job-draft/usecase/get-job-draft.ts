import { getJobDraft } from "../repo/get-job-draft";

export const getAdminJobDraft = async (jobId: string) => {
  return getJobDraft(jobId);
};
