import { mapUploadResult } from "../mapper/map-upload-result";
import { buildUploadContext } from "../normalize/build-upload-context";
import { persistUploadedRecord } from "../repo/persist-uploaded-record";

export const completeUpload = async (jobId: string) => {
  const context = buildUploadContext(jobId);

  await persistUploadedRecord({
    jobId,
    uploadedAt: context.uploadedAt,
    youtubeVideoId: context.youtubeVideoId,
  });

  return mapUploadResult({
    jobId,
    uploadedAt: context.uploadedAt,
    youtubeVideoId: context.youtubeVideoId,
  });
};
