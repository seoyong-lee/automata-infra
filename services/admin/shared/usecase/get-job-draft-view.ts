import { getAdminJobDraft } from "../../jobs/get-job-draft/usecase/get-job-draft";

export const getJobDraftView = async (jobId: string) => {
  return getAdminJobDraft(jobId);
};
