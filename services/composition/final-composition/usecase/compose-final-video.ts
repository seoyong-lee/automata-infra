import {
  composeWithFargate,
  composeWithShotstack,
} from "../../../shared/lib/providers/media";

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
  renderPlan: Record<string, unknown> & {
    renderProvider?: "SHOTSTACK" | "FARGATE";
  };
  secretId: string;
}): Promise<CompositionResult> => {
  const useFargate =
    input.renderPlan.renderProvider === "FARGATE" ||
    (input.renderPlan.renderProvider !== "SHOTSTACK" &&
      (
    process.env.ENABLE_FARGATE_COMPOSITION === "1" ||
    process.env.ENABLE_FARGATE_COMPOSITION === "true"
      ));
  if (useFargate) {
    return (await composeWithFargate({
      jobId: input.jobId,
      renderPlan: input.renderPlan,
    })) as CompositionResult;
  }
  return (await composeWithShotstack({
    jobId: input.jobId,
    renderPlan: input.renderPlan,
    secretId: input.secretId,
  })) as CompositionResult;
};
