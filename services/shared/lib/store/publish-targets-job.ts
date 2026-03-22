import {
  publishTargetSchema,
  type PublishTargetRow,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import {
  deleteItemFromTable,
  getItem,
  getJobsTableName,
  putItem,
  queryItems,
} from "../aws/runtime";
import { jobPk } from "./video-jobs";

const skPrefix = "PUBLISH_TARGET#";

export const listPublishTargetsByJob = async (
  jobId: string,
): Promise<PublishTargetRow[]> => {
  const items = await queryItems<Record<string, unknown>>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
      ":sk": skPrefix,
    },
    limit: 50,
  });
  const out: PublishTargetRow[] = [];
  for (const raw of items) {
    const { PK: _pk, SK: _sk, ...rest } = raw;
    const parsed = publishTargetSchema.safeParse(rest);
    if (parsed.success) {
      out.push(parsed.data);
    }
  }
  return out;
};

export const putPublishTargetJobItem = async (
  jobId: string,
  row: PublishTargetRow,
): Promise<void> => {
  const parsed = publishTargetSchema.parse(row);
  await putItem({
    PK: jobPk(jobId),
    SK: `${skPrefix}${parsed.publishTargetId}`,
    ...parsed,
  } as unknown as Record<string, unknown>);
};

export const updatePublishTargetJobItem = async (
  jobId: string,
  publishTargetId: string,
  patch: Partial<
    Pick<
      PublishTargetRow,
      | "status"
      | "scheduledAt"
      | "externalPostId"
      | "externalUrl"
      | "publishError"
    >
  >,
): Promise<void> => {
  const first = await getItem<Record<string, unknown>>({
    PK: jobPk(jobId),
    SK: `${skPrefix}${publishTargetId}`,
  });
  if (!first) {
    throw new Error("publish target not found");
  }
  const { PK: _p, SK: _s, ...base } = first;
  const merged = { ...base, ...patch };
  const parsed = publishTargetSchema.parse(merged);
  await putItem({
    PK: jobPk(jobId),
    SK: `${skPrefix}${publishTargetId}`,
    ...parsed,
  } as unknown as Record<string, unknown>);
};

export const replacePublishTargetsForJob = async (
  jobId: string,
  targets: PublishTargetRow[],
): Promise<void> => {
  const existing = await listPublishTargetsByJob(jobId);
  for (const t of existing) {
    await deleteItemFromTable(getJobsTableName(), {
      PK: jobPk(jobId),
      SK: `${skPrefix}${t.publishTargetId}`,
    });
  }
  for (const t of targets) {
    await putPublishTargetJobItem(jobId, t);
  }
};
