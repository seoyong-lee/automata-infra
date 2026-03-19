export const mapReviewMessage = (input: {
  jobId: string;
  previewS3Key: string;
  queuedAt: string;
}) => {
  return {
    jobId: input.jobId,
    previewS3Key: input.previewS3Key,
    queuedAt: input.queuedAt,
  };
};
