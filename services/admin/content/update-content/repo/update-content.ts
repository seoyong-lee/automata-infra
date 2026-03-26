import {
  getContentMeta,
  putContentMeta,
  type ContentItem,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { mapContentItemToDto } from "../../../shared/mapper/map-content-item";
import type { UpdateContentInputDto } from "../../../shared/types";

const stripYoutubeFields = (item: ContentItem): ContentItem => {
  const next = { ...item };
  delete next.youtubeSecretName;
  delete next.youtubeAccountType;
  delete next.autoPublishEnabled;
  delete next.defaultVisibility;
  delete next.defaultCategoryId;
  delete next.playlistId;
  delete next.youtubeUpdatedAt;
  delete next.youtubeUpdatedBy;
  return next;
};

const YOUTUBE_DRAFT_FIELD_KEYS: Array<keyof UpdateContentInputDto> = [
  "youtubeSecretName",
  "youtubeAccountType",
  "autoPublishEnabled",
  "defaultVisibility",
  "defaultCategoryId",
  "playlistId",
];

const hasYoutubeDraftFields = (d: UpdateContentInputDto): boolean =>
  YOUTUBE_DRAFT_FIELD_KEYS.some((key) => d[key] !== undefined);

const setOptionalTrimmedString = (
  target: ContentItem,
  key: "youtubeSecretName" | "youtubeAccountType" | "playlistId",
  value: string | undefined,
): void => {
  if (value === undefined) {
    return;
  }
  if (value.trim() === "") {
    delete target[key];
  } else {
    target[key] = value.trim();
  }
};

const applyYoutubeDraftToContent = (
  next: ContentItem,
  d: UpdateContentInputDto,
  now: string,
  actor: string,
): void => {
  setOptionalTrimmedString(next, "youtubeSecretName", d.youtubeSecretName);
  setOptionalTrimmedString(next, "youtubeAccountType", d.youtubeAccountType);
  if (d.autoPublishEnabled !== undefined) {
    next.autoPublishEnabled = d.autoPublishEnabled;
  }
  if (d.defaultVisibility !== undefined) {
    next.defaultVisibility = d.defaultVisibility;
  }
  if (d.defaultCategoryId !== undefined) {
    next.defaultCategoryId = d.defaultCategoryId;
  }
  setOptionalTrimmedString(next, "playlistId", d.playlistId);
  next.youtubeUpdatedAt = now;
  next.youtubeUpdatedBy = actor;
};

const applyLabel = (next: ContentItem, d: UpdateContentInputDto): void => {
  if (d.label !== undefined) {
    next.label = d.label;
  }
};

export const updateContentRecord = async (input: {
  draft: UpdateContentInputDto;
  now: string;
  actor: string;
}) => {
  const existing = await getContentMeta(input.draft.contentId);
  if (!existing) {
    throw notFound("content not found");
  }

  const d = input.draft;
  let next: ContentItem = { ...existing, updatedAt: input.now };

  if (d.clearYoutubePublish) {
    next = stripYoutubeFields(next);
    next.updatedAt = input.now;
    await putContentMeta(next);
    return mapContentItemToDto(next);
  }

  applyLabel(next, d);
  if (hasYoutubeDraftFields(d)) {
    applyYoutubeDraftToContent(next, d, input.now, input.actor);
  }

  await putContentMeta(next);
  return mapContentItemToDto(next);
};
