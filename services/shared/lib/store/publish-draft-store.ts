import {
  contentPublishDraftSchema,
  type ContentPublishDraft,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import { getItem, putItem } from "../aws/runtime";
import { jobPk } from "./video-jobs";

const publishDraftSk = "PUBLISH_DRAFT" as const;

export type PublishDraftRow = ContentPublishDraft & {
  PK: string;
  SK: typeof publishDraftSk;
  updatedAt: string;
};

export const getContentPublishDraft = async (
  jobId: string,
): Promise<ContentPublishDraft | null> => {
  const row = await getItem<PublishDraftRow>({
    PK: jobPk(jobId),
    SK: publishDraftSk,
  });
  if (!row) {
    return null;
  }
  const { PK, SK, updatedAt, ...rest } = row;
  return contentPublishDraftSchema.parse(rest);
};

export const putContentPublishDraft = async (
  draft: ContentPublishDraft,
): Promise<ContentPublishDraft> => {
  const parsed = contentPublishDraftSchema.parse(draft);
  const now = new Date().toISOString();
  const row: PublishDraftRow = {
    ...parsed,
    PK: jobPk(parsed.channelContentItemId),
    SK: publishDraftSk,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return parsed;
};
