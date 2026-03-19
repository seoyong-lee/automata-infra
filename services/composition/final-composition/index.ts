import { Handler } from "aws-lambda";
import { persistComposition } from "./repo/persist-composition";
import { composeFinalVideo } from "./usecase/compose-final-video";

type CompositionEvent = {
  jobId: string;
  renderPlan: Record<string, unknown> & {
    totalDurationSec: number;
  };
};

type CompositionResult = Record<string, unknown> & {
  finalVideoS3Key: string;
  thumbnailS3Key: string;
  previewS3Key: string;
  provider: string;
  providerRenderId?: string | null;
};

export const run: Handler<
  CompositionEvent,
  CompositionEvent & { finalArtifact: unknown; status: string }
> = async (event) => {
  const composition = (await composeFinalVideo({
    jobId: event.jobId,
    renderPlan: event.renderPlan,
    secretId: process.env.SHOTSTACK_SECRET_ID ?? "",
  })) as CompositionResult;

  await persistComposition(event.jobId, composition);

  return {
    ...event,
    status: "RENDERED",
    finalArtifact: {
      finalVideoS3Key: composition.finalVideoS3Key,
      thumbnailS3Key: composition.thumbnailS3Key,
      previewS3Key: composition.previewS3Key,
      provider: composition.provider,
      totalDurationSec: event.renderPlan.totalDurationSec,
    },
  };
};
