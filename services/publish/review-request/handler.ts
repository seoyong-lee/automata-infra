import { Handler } from "aws-lambda";

type ReviewRequestEvent = {
  jobId: string;
  finalArtifact: {
    previewS3Key: string;
  };
};

export const handler: Handler<
  ReviewRequestEvent,
  ReviewRequestEvent & { review: unknown; status: string }
> = async (event) => {
  return {
    ...event,
    status: "REVIEW_PENDING",
    review: {
      queuedAt: new Date().toISOString(),
      previewS3Key: event.finalArtifact.previewS3Key,
    },
  };
};
