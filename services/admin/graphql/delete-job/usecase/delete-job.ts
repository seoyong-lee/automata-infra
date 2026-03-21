import { deleteAdminJobRecord } from "../repo/delete-job";

export const deleteAdminJob = async (input: { jobId: string }) => {
  return deleteAdminJobRecord(input.jobId);
};
