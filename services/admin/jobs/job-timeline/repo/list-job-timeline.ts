import { listJobItems } from "../../../../shared/lib/store/video-jobs";

export const listJobTimeline = async (jobId: string) => {
  return listJobItems(jobId);
};
