import { composeWithFargate } from "../../../shared/lib/providers/media";

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
  executionSk?: string;
  renderPlan: Record<string, unknown>;
}): Promise<CompositionResult> => {
  return (await composeWithFargate({
    jobId: input.jobId,
    executionSk: input.executionSk,
    renderPlan: input.renderPlan,
  })) as CompositionResult;
};
