import { getItem, putItem, queryItems, queryItemsPage } from "../aws/runtime";
import {
  decodeNextToken,
  encodeNextToken,
  jobPk,
  type QueryPage,
} from "./video-jobs-shared";

export const sortByCreatedAtDesc = <T extends { createdAt: string }>(
  items: T[],
): T[] => {
  return items.sort((left, right) => {
    const a = new Date(right.createdAt).getTime();
    const b = new Date(left.createdAt).getTime();
    return a - b;
  });
};

export const toEncodedQueryPage = <T>(page: {
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
}): QueryPage<T> => {
  return {
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  };
};

export const mapEncodedQueryPage = <TRaw, TMapped>(input: {
  page: {
    items: TRaw[];
    lastEvaluatedKey?: Record<string, unknown>;
  };
  mapItem: (item: TRaw) => TMapped;
}): QueryPage<TMapped> => {
  return {
    items: input.page.items.map(input.mapItem),
    nextToken: encodeNextToken(input.page.lastEvaluatedKey),
  };
};

export const queryVideoJobsPage = async <T>(input: {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
  nextToken?: string;
}): Promise<{
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
}> => {
  return queryItemsPage<T>({
    indexName: input.indexName,
    keyConditionExpression: input.keyConditionExpression,
    expressionAttributeNames: input.expressionAttributeNames,
    expressionAttributeValues: input.expressionAttributeValues,
    scanIndexForward: input.scanIndexForward,
    limit: input.limit,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
};

export const putJobScopedItem = async (
  jobId: string,
  sk: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: sk,
    ...item,
  });
};

export const getJobScopedItem = async <T>(
  jobId: string,
  sk: string,
): Promise<T | null> => {
  return getItem<T>({
    PK: jobPk(jobId),
    SK: sk,
  });
};

export const listJobScopedItems = async <T>(input: {
  jobId: string;
  skPrefix?: string;
  limit: number;
  scanIndexForward: boolean;
}): Promise<T[]> => {
  return queryItems<T>({
    keyConditionExpression: input.skPrefix
      ? "PK = :pk AND begins_with(SK, :skPrefix)"
      : "PK = :pk",
    expressionAttributeValues: {
      ":pk": jobPk(input.jobId),
      ...(input.skPrefix ? { ":skPrefix": input.skPrefix } : {}),
    },
    scanIndexForward: input.scanIndexForward,
    limit: input.limit,
  });
};

/** begins_with(SK, prefix)로 파티션을 페이지 단위로 전부 조회 (후보 행이 많아도 누락 없음) */
export const listAllJobScopedItemsWithSkPrefix = async <T>(
  jobId: string,
  skPrefix: string,
  scanIndexForward = true,
): Promise<T[]> => {
  const all: T[] = [];
  let nextToken: string | undefined;
  do {
    const page = await queryVideoJobsPage<T>({
      keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      expressionAttributeValues: {
        ":pk": jobPk(jobId),
        ":skPrefix": skPrefix,
      },
      scanIndexForward,
      limit: 100,
      nextToken,
    });
    all.push(...page.items);
    nextToken = encodeNextToken(page.lastEvaluatedKey) ?? undefined;
  } while (nextToken);
  return all;
};

export const listAllJobScopedItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  const all: Record<string, unknown>[] = [];
  let nextToken: string | undefined;

  do {
    const page = await queryVideoJobsPage<Record<string, unknown>>({
      keyConditionExpression: "PK = :pk",
      expressionAttributeValues: {
        ":pk": jobPk(jobId),
      },
      scanIndexForward: true,
      limit: 100,
      nextToken,
    });
    all.push(...page.items);
    nextToken = encodeNextToken(page.lastEvaluatedKey) ?? undefined;
  } while (nextToken);

  return all;
};

type SceneCandidateKind =
  | "IMAGE_CANDIDATE"
  | "VIDEO_CANDIDATE"
  | "VOICE_CANDIDATE";

const buildSceneCandidateSk = (
  sceneId: number,
  kind: SceneCandidateKind,
  candidateId: string,
): string => {
  return `SCENE#${sceneId}#${kind}#${candidateId}`;
};

const buildSceneCandidatePrefix = (
  sceneId: number,
  kind: SceneCandidateKind,
): string => {
  return `SCENE#${sceneId}#${kind}#`;
};

export const putSceneCandidateItem = async <TCandidate extends object>(input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
  kind: SceneCandidateKind;
  item: TCandidate;
}): Promise<void> => {
  await putJobScopedItem(
    input.jobId,
    buildSceneCandidateSk(input.sceneId, input.kind, input.candidateId),
    {
      sceneId: input.sceneId,
      candidateId: input.candidateId,
      ...input.item,
    },
  );
};

export const getSceneCandidateItem = async <TCandidate>(input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
  kind: SceneCandidateKind;
}): Promise<TCandidate | null> => {
  return getJobScopedItem<TCandidate>(
    input.jobId,
    buildSceneCandidateSk(input.sceneId, input.kind, input.candidateId),
  );
};

export const listSceneCandidateItems = async <
  TCandidate extends { createdAt: string },
>(input: {
  jobId: string;
  sceneId: number;
  kind: SceneCandidateKind;
}): Promise<TCandidate[]> => {
  const items = await listJobScopedItems<TCandidate>({
    jobId: input.jobId,
    skPrefix: buildSceneCandidatePrefix(input.sceneId, input.kind),
    scanIndexForward: false,
    limit: 100,
  });

  const forScene = items.filter((item) => {
    const sid = (item as { sceneId?: unknown }).sceneId;
    return typeof sid === "number" && sid === input.sceneId;
  });

  return sortByCreatedAtDesc(forScene);
};
