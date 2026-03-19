import { queueUploadRecord } from "../repo/queue-upload-record";

export const requestUpload = async (
  jobId: string,
): Promise<{ status: string; platform: string }> => {
  await queueUploadRecord(jobId);

  return {
    status: "UPLOAD_QUEUED",
    platform: "youtube",
  };
};
