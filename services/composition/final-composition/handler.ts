import { Handler } from "aws-lambda";

type CompositionEvent = {
  jobId: string;
  renderPlan: {
    totalDurationSec: number;
  };
};

export const handler: Handler<
  CompositionEvent,
  CompositionEvent & { finalArtifact: unknown; status: string }
> = async (event) => {
  return {
    ...event,
    status: "RENDERED",
    finalArtifact: {
      finalVideoS3Key: `rendered/${event.jobId}/final.mp4`,
      thumbnailS3Key: `rendered/${event.jobId}/thumbnail.jpg`,
      previewS3Key: `previews/${event.jobId}/preview.mp4`,
      totalDurationSec: event.renderPlan.totalDurationSec,
    },
  };
};
