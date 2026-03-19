export const buildUploadContext = (jobId: string) => {
  const uploadedAt = new Date().toISOString();
  const youtubeVideoId = `yt_${jobId}`;

  return {
    uploadedAt,
    youtubeVideoId,
  };
};
