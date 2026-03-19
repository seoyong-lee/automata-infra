import { Handler } from "aws-lambda";
import { sendReviewMessage } from "../../shared/lib/aws/runtime";
import {
  putReviewRecord,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

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
  const queuedAt = new Date().toISOString();
  const jobId = event.input.jobId;
  const previewS3Key = event.input.finalArtifact.previewS3Key;

  await putReviewRecord(jobId, {
    action: "PENDING",
    previewS3Key,
    queuedAt,
  });

  await updateJobMeta(
    jobId,
    {
      reviewTaskToken: event.taskToken,
      reviewRequestedAt: queuedAt,
      reviewPreviewS3Key: previewS3Key,
      reviewAction: "PENDING",
    },
    "REVIEW_PENDING",
  );

  await sendReviewMessage({
    jobId,
    previewS3Key,
    queuedAt,
  });

  return {
    queued: true,
    jobId,
  };
};
