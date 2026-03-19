import { Handler } from "aws-lambda";
import { parseReviewRequest } from "./normalize/parse-review-request";
import { queueReviewRequest } from "./usecase/queue-review-request";

type ReviewRequestInput = {
  taskToken: string;
  input: {
    jobId: string;
    finalArtifact: {
      previewS3Key: string;
    };
  };
};

export const run: Handler<
  ReviewRequestInput,
  { queued: boolean; jobId: string }
> = async (event) => {
  const parsed = parseReviewRequest(event);
  await queueReviewRequest(parsed);

  return {
    queued: true,
    jobId: parsed.jobId,
  };
};
