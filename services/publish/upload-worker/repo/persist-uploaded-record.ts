import {
  putUploadRecord,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";

export const persistUploadedRecord = async (input: {
  jobId: string;
  uploadedAt: string;
  youtubeVideoId: string;
}): Promise<void> => {
  await putUploadRecord(input.jobId, {
    platform: "youtube",
    uploadStatus: "UPLOADED",
    youtubeVideoId: input.youtubeVideoId,
    visibility: "private",
    publishedAt: input.uploadedAt,
  });

  await updateJobMeta(
    input.jobId,
    {
      uploadStatus: "UPLOADED",
      uploadVideoId: input.youtubeVideoId,
    },
    "UPLOADED",
  );
};
