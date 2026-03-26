import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJob } from "../repo/get-job";

export const getAdminJob = async (jobId: string) => {
  const item = await getJob(jobId);
  if (!item) {
    return null;
  }
  return mapJobMetaToAdminJob(item);
};
