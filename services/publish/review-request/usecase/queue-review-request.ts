import { sendReviewMessage } from "../../../shared/lib/aws/runtime";
import { mapReviewMessage } from "../mapper/map-review-message";
import { persistReviewRequest } from "../repo/persist-review-request";

export const queueReviewRequest = async (input: {
  jobId: string;
  previewS3Key: string;
  queuedAt: string;
  taskToken: string;
}): Promise<void> => {
  await persistReviewRequest(input);
  await sendReviewMessage(mapReviewMessage(input));
};
