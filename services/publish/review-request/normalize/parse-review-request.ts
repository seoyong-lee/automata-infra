type ReviewRequestInput = {
  taskToken: string;
  input: {
    jobId: string;
    finalArtifact: {
      previewS3Key: string;
    };
  };
};

export const parseReviewRequest = (event: ReviewRequestInput) => {
  const queuedAt = new Date().toISOString();
  const jobId = event.input.jobId;
  const previewS3Key = event.input.finalArtifact.previewS3Key;

  return {
    queuedAt,
    jobId,
    previewS3Key,
    taskToken: event.taskToken,
  };
};
