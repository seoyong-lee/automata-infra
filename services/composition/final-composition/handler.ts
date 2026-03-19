import { Handler } from "aws-lambda";
import { composeWithShotstack } from "../../shared/lib/providers/media";
import { putBufferToS3 } from "../../shared/lib/aws/runtime";
import {
  putRenderArtifact,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

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

const storeRenderedArtifacts = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await putBufferToS3(
    composition.finalVideoS3Key,
    `final video placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.thumbnailS3Key,
    `thumbnail placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.previewS3Key,
    `preview placeholder for ${jobId}`,
    "text/plain",
  );
};

const persistComposition = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await putRenderArtifact(jobId, {
    finalVideoS3Key: composition.finalVideoS3Key,
    thumbnailS3Key: composition.thumbnailS3Key,
    previewS3Key: composition.previewS3Key,
    provider: composition.provider,
    providerRenderId: composition.providerRenderId ?? null,
    createdAt: new Date().toISOString(),
  });

  await updateJobMeta(
    jobId,
    {
      finalVideoS3Key: composition.finalVideoS3Key,
      thumbnailS3Key: composition.thumbnailS3Key,
      previewS3Key: composition.previewS3Key,
    },
    "RENDERED",
  );
};

export const handler: Handler<
  CompositionEvent,
  CompositionEvent & { finalArtifact: unknown; status: string }
> = async (event) => {
  const composition = (await composeWithShotstack({
    jobId: event.jobId,
    renderPlan: event.renderPlan,
    secretId: process.env.SHOTSTACK_SECRET_ID ?? "",
  })) as CompositionResult;

  await storeRenderedArtifacts(event.jobId, composition);
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
