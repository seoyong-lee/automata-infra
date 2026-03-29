import type { RenderArtifactItem } from "../../../shared/lib/store/video-jobs";

export const normalizeRenderArtifact = (item: RenderArtifactItem) => {
  return {
    finalVideoS3Key:
      typeof item.finalVideoS3Key === "string"
        ? item.finalVideoS3Key
        : undefined,
    thumbnailS3Key:
      typeof item.thumbnailS3Key === "string" ? item.thumbnailS3Key : undefined,
    previewS3Key:
      typeof item.previewS3Key === "string" ? item.previewS3Key : undefined,
    renderPlanS3Key:
      typeof item.renderPlanS3Key === "string"
        ? item.renderPlanS3Key
        : undefined,
    subtitleAssS3Key:
      typeof item.subtitleAssS3Key === "string"
        ? item.subtitleAssS3Key
        : undefined,
    provider: typeof item.provider === "string" ? item.provider : undefined,
    providerRenderId:
      typeof item.providerRenderId === "string" ||
      item.providerRenderId === null
        ? item.providerRenderId
        : undefined,
    createdAt: item.createdAt,
  };
};
