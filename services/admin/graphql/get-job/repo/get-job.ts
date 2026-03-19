import { getJobMeta } from "../../../../shared/lib/store/video-jobs";

export const getJob = async (jobId: string) => {
  return getJobMeta(jobId);
};
