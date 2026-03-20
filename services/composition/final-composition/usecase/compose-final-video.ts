import { composeWithShotstack } from "../../../shared/lib/providers/media/shotstack";

type CompositionResult = Record<string, unknown> & {
  finalVideoS3Key: string;
  thumbnailS3Key: string;
  previewS3Key: string;
  provider: string;
  providerRenderId?: string | null;
  sourceVideoUrl?: string;
  sourceThumbnailUrl?: string;
};

export const composeFinalVideo = async (input: {
  jobId: string;
  renderPlan: Record<string, unknown>;
  secretId: string;
}): Promise<CompositionResult> => {
  return (await composeWithShotstack({
    jobId: input.jobId,
    renderPlan: input.renderPlan,
    secretId: input.secretId,
  })) as CompositionResult;
};
