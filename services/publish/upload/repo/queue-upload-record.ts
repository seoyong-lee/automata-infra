import {
  putUploadRecord,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";

export const queueUploadRecord = async (jobId: string): Promise<void> => {
  await putUploadRecord(jobId, {
    platform: "youtube",
    uploadStatus: "QUEUED",
    requestedAt: new Date().toISOString(),
    visibility: "private",
  });

  await updateJobMeta(jobId, { uploadStatus: "QUEUED" }, "APPROVED");
};
