import { randomUUID } from "crypto";
import {
  CONTENT_CATALOG_GSI_PK,
  putContentMeta,
  type ContentItem,
} from "../../../../shared/lib/store/video-jobs";
import { mapContentItemToDto } from "../../shared/mapper/map-content-item";
import type { CreateContentInputDto } from "../../shared/types";

export const createContentRecord = async (input: {
  draft: CreateContentInputDto;
  now: string;
  actor: string;
}) => {
  const contentId = `cnt_${randomUUID().replace(/-/g, "")}`;
  const d = input.draft;
  const hasYoutube =
    d.youtubeSecretName !== null ||
    d.youtubeAccountType !== null ||
    d.autoPublishEnabled !== null ||
    d.defaultVisibility !== null ||
    d.defaultCategoryId !== null ||
    d.playlistId !== null;

  const item: ContentItem = {
    PK: `CONTENT#${contentId}`,
    SK: "META",
    contentId,
    label: d.label,
    createdAt: input.now,
    updatedAt: input.now,
    GSI6PK: CONTENT_CATALOG_GSI_PK,
    GSI6SK: `${input.now}#${contentId}`,
    ...(hasYoutube
      ? {
          youtubeSecretName: d.youtubeSecretName,
          youtubeAccountType: d.youtubeAccountType,
          autoPublishEnabled: d.autoPublishEnabled,
          defaultVisibility: d.defaultVisibility,
          defaultCategoryId: d.defaultCategoryId,
          playlistId: d.playlistId,
          youtubeUpdatedAt: input.now,
          youtubeUpdatedBy: input.actor,
        }
      : {}),
  };
  await putContentMeta(item);
  return mapContentItemToDto(item);
};
