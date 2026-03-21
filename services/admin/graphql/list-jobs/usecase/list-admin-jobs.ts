import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { ConnectionDto } from "../../shared/types";
import { listJobs } from "../repo/list-jobs";

export const listAdminJobs = async (input: {
  status?: string;
  contentId?: string;
  nextToken?: string;
  limit: number;
}): Promise<ConnectionDto<ReturnType<typeof mapJobMetaToAdminJob>>> => {
  const page = await listJobs(input);
  return {
    items: page.items.map(mapJobMetaToAdminJob),
    nextToken: page.nextToken,
  };
};
