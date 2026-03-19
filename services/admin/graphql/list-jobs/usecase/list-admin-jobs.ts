import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { listJobs } from "../repo/list-jobs";

export const listAdminJobs = async (input: {
  status?: string;
  channelId?: string;
  limit: number;
}) => {
  const jobs = await listJobs(input);
  return jobs.map(mapJobMetaToAdminJob);
};
