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

const normalizeStoredSceneId = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const mediaKeyForCandidateDedupe = (
  item: Record<string, unknown>,
  kind: SceneCandidateKind,
): string => {
  if (kind === "IMAGE_CANDIDATE") {
    const k = item.imageS3Key;
    if (typeof k === "string" && k.length > 0) {
      return `img:${k}`;
    }
  }
  if (kind === "VIDEO_CANDIDATE") {
    const k = item.videoClipS3Key;
    if (typeof k === "string" && k.length > 0) {
      return `vid:${k}`;
    }
  }
  if (kind === "VOICE_CANDIDATE") {
    const k = item.voiceS3Key;
    if (typeof k === "string" && k.length > 0) {
      return `voc:${k}`;
    }
  }
  const id = item.candidateId;
  return `id:${typeof id === "string" ? id : String(id)}`;
};

/** 동일 S3(또는 동일 음성 키)로 중복 적재된 후보 행이 있으면 최신 `createdAt` 하나만 남긴다. */
const dedupeSceneCandidatesByMediaKey = <
  TCandidate extends { createdAt: string },
>(
  items: TCandidate[],
  kind: SceneCandidateKind,
): TCandidate[] => {
  const sorted = sortByCreatedAtDesc([...items]);
  const seen = new Set<string>();
  const out: TCandidate[] = [];
  for (const item of sorted) {
    const key = mediaKeyForCandidateDedupe(
      item as Record<string, unknown>,
      kind,
    );
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return sortByCreatedAtDesc(out);
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
  const skPrefix = buildSceneCandidatePrefix(input.sceneId, input.kind);
  const expectedPk = jobPk(input.jobId);
  const items = await listAllJobScopedItemsWithSkPrefix<TCandidate>(
    input.jobId,
    skPrefix,
    false,
  );

  const forScene = items.filter((item) => {
    const row = item as { PK?: unknown; SK?: unknown; sceneId?: unknown };
    if (row.PK !== undefined && String(row.PK) !== expectedPk) {
      return false;
    }
    if (typeof row.SK !== "string" || !row.SK.startsWith(skPrefix)) {
      return false;
    }
    const sid = normalizeStoredSceneId(row.sceneId);
    if (sid !== undefined && sid !== input.sceneId) {
      return false;
    }
    return true;
  });

  return sortByCreatedAtDesc(
    dedupeSceneCandidatesByMediaKey(forScene, input.kind),
  );
};
