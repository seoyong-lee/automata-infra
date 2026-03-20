export const mapUploadResult = (input: {
  jobId: string;
  uploadedAt: string;
  youtubeVideoId: string;
  visibility: string;
  publishAt?: string;
}) => {
  return {
    jobId: input.jobId,
    status: "UPLOADED",
    upload: {
      platform: "youtube",
      youtubeVideoId: input.youtubeVideoId,
      visibility: input.visibility,
      uploadedAt: input.uploadedAt,
      publishAt: input.publishAt,
    },
  };
};
