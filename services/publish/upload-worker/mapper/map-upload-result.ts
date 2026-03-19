export const mapUploadResult = (input: {
  jobId: string;
  uploadedAt: string;
  youtubeVideoId: string;
}) => {
  return {
    jobId: input.jobId,
    status: "UPLOADED",
    upload: {
      platform: "youtube",
      youtubeVideoId: input.youtubeVideoId,
      visibility: "private",
      uploadedAt: input.uploadedAt,
    },
  };
};
