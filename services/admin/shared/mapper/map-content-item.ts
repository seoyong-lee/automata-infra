import type { ContentItem } from "../../../shared/lib/store/video-jobs";
import type { ContentDto } from "../types";

export const mapContentItemToDto = (c: ContentItem): ContentDto => ({
  contentId: c.contentId,
  label: c.label,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  youtubeSecretName: c.youtubeSecretName,
  youtubeAccountType: c.youtubeAccountType,
  autoPublishEnabled: c.autoPublishEnabled,
  defaultVisibility: c.defaultVisibility,
  defaultCategoryId: c.defaultCategoryId,
  playlistId: c.playlistId,
  youtubeUpdatedAt: c.youtubeUpdatedAt,
  youtubeUpdatedBy: c.youtubeUpdatedBy,
});
