import { randomUUID } from "node:crypto";

import {
  ideaCandidateSchema,
  type IdeaCandidate,
  type IdeaCandidateStatus,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { batchGetItems, getItem, putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const ideaPk = (id: string): string => `IDEA_CANDIDATE#${id}`;
const linkPrefix = "IDEA_CAND#";

export type IdeaCandidateRow = IdeaCandidate & {
  PK: string;
  SK: "META";
  createdAt: string;
  updatedAt: string;
};

export type IdeaCandidateLinkRow = {
  PK: string;
  SK: string;
  ideaCandidateId: string;
  contentId: string;
  createdAt: string;
};

export const createIdeaCandidate = async (input: {
  contentId: string;
  trendSignalIds: string[];
  title: string;
  hook?: string;
  rationale?: string;
  score: number;
  status?: IdeaCandidateStatus;
}): Promise<IdeaCandidateRow> => {
  const id = `idea_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = ideaCandidateSchema.parse({
    id,
    contentId: input.contentId,
    trendSignalIds: input.trendSignalIds,
    title: input.title.trim(),
    hook: input.hook?.trim(),
    rationale: input.rationale?.trim(),
    score: input.score,
    status: input.status ?? "PENDING",
  });
  const row: IdeaCandidateRow = {
    ...parsed,
    PK: ideaPk(id),
    SK: "META",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  const link: IdeaCandidateLinkRow = {
    PK: contentPk(input.contentId),
    SK: `${linkPrefix}${id}`,
    ideaCandidateId: id,
    contentId: input.contentId,
    createdAt: now,
  };
  await putItem(link as unknown as Record<string, unknown>);
  return row;
};

export const getIdeaCandidate = async (
  ideaCandidateId: string,
): Promise<IdeaCandidateRow | null> => {
  return getItem<IdeaCandidateRow>({
    PK: ideaPk(ideaCandidateId),
    SK: "META",
  });
};

export const listIdeaCandidatesForChannel = async (
  channelId: string,
  limit = 100,
): Promise<IdeaCandidateRow[]> => {
  const links = await queryItems<IdeaCandidateLinkRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": linkPrefix,
    },
    scanIndexForward: false,
    limit,
  });
  const keys = links.map((link) => ({
    PK: ideaPk(link.ideaCandidateId),
    SK: "META" as const,
  }));
  const batch = await batchGetItems<IdeaCandidateRow>(keys);
  const rows = batch.filter((r): r is IdeaCandidateRow => r !== null);
  return rows.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

export const updateIdeaCandidate = async (input: {
  ideaCandidateId: string;
  status?: IdeaCandidateStatus;
  promotedSourceItemId?: string;
  title?: string;
  hook?: string;
  rationale?: string;
  score?: number;
}): Promise<IdeaCandidateRow> => {
  const existing = await getIdeaCandidate(input.ideaCandidateId);
  if (!existing) {
    throw new Error(`idea candidate not found: ${input.ideaCandidateId}`);
  }
  const now = new Date().toISOString();
  const next = ideaCandidateSchema.parse({
    id: existing.id,
    contentId: existing.contentId,
    trendSignalIds: existing.trendSignalIds,
    title: input.title?.trim() ?? existing.title,
    hook: input.hook?.trim() ?? existing.hook,
    rationale: input.rationale?.trim() ?? existing.rationale,
    score: input.score ?? existing.score,
    status: input.status ?? existing.status,
    promotedSourceItemId:
      input.promotedSourceItemId ?? existing.promotedSourceItemId,
  });
  const row: IdeaCandidateRow = {
    ...next,
    PK: existing.PK,
    SK: "META",
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};
