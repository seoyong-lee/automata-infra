import { normalizeRenderArtifact } from "../normalize/normalize-render-artifact";
import type { RenderArtifactDto } from "../types";
import type { RenderArtifactItem } from "../../../shared/lib/store/video-jobs";

export const mapRenderArtifactDraft = (
  item: RenderArtifactItem,
): RenderArtifactDto => {
  return normalizeRenderArtifact(item);
};
