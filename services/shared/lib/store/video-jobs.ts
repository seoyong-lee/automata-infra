import {
  deleteItemFromTable,
  getItem,
  getJobsTableName,
  putItem,
  queryItems,
  queryItemsPage,
  updateItem,
} from "../aws/runtime";

export type JobMetaItem = {
  PK: string;
  SK: "META";
  jobId: string;
  contentId?: string;
  contentType?: string;
  variant?: string;
  topicId: string;
  topicHash: string;
  status: string;
  autoPublish?: boolean;
  publishAt?: string;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  estimatedCost: number;
  providerCosts: Record<string, number>;
  reviewMode: boolean;
  retryCount: number;
  lastError: string | null;
  topicSeedS3Key?: string;
  topicS3Key?: string;
  sceneJsonS3Key?: string;
  renderPlanS3Key?: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  reviewTaskToken?: string;
  reviewRequestedAt?: string;
  reviewAction?: string;
  reviewPreviewS3Key?: string;
  uploadStatus?: string;
  uploadVideoId?: string;
  contentBriefS3Key?: string;
  /** 문서상 채택본: 토픽 플랜 단계에서 승인한 실행 ID. */
  approvedTopicExecutionId?: string;
  /** 씬 JSON 단계에서 승인한 실행 ID. */
  approvedSceneExecutionId?: string;
  /** 에셋 생성 단계에서 승인한 실행 ID. */
  approvedAssetExecutionId?: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
  GSI4PK?: string;
  GSI4SK?: string;
  GSI5PK?: string;
  GSI5SK?: string;
};

/**
 * 최상위 단위: 콘텐츠 = 채널(하나의 ID로 통합).
 * PK = CONTENT#${contentId}, SK = META
 * 유튜브 게시 설정은 CONFIG_TABLE이 아닌 동일 아이템에 저장한다.
 */
export type ContentItem = {
  PK: string;
  SK: "META";
  contentId: string;
  /** 표시용 이름 */
  label: string;
  createdAt: string;
  updatedAt: string;
  /** 전체 콘텐츠 목록 조회용 고정 파티션 */
  GSI6PK: string;
  GSI6SK: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
  youtubeUpdatedAt?: string;
  youtubeUpdatedBy?: string;
};

export const CONTENT_CATALOG_GSI_PK = "CONTENT_CATALOG";

/**
 * 잡 메타의 GSI2 파티션. 카탈로그 콘텐츠(cnt_…)는 GSI5와 동일한 CONTENT# 접두사를 쓰고,
 * 레거시 토픽 전용 잡은 CHANNEL# 접두사를 유지한다.
 */
export const gsi2PkForContentId = (contentId: string): string => {
  if (contentId.startsWith("cnt_")) {
    return `CONTENT#${contentId}`;
  }
  return `CHANNEL#${contentId}`;
};

type JobMetaRow = JobMetaItem & { channelId?: string };

const normalizeJobMeta = (raw: JobMetaRow): JobMetaItem => {
  const { channelId: legacy, ...rest } = raw;
  const contentId = rest.contentId ?? legacy;
  return { ...rest, contentId };
};

const mapJobMetaPage = (
  page: QueryPage<JobMetaItem>,
): QueryPage<JobMetaItem> => ({
  items: page.items.map((x) => normalizeJobMeta(x as JobMetaRow)),
  nextToken: page.nextToken,
});

export type QueryPage<T> = {
  items: T[];
  nextToken: string | null;
};

export type SceneAssetItem = {
  PK: string;
  SK: string;
  sceneId: number;
  visualType?: string;
  durationSec?: number;
  narration?: string;
  subtitle?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  imageS3Key?: string;
  videoClipS3Key?: string;
  voiceS3Key?: string;
  validationStatus?: string;
  [key: string]: unknown;
};

const encodeNextToken = (key?: Record<string, unknown>): string | null => {
  if (!key) {
    return null;
  }
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
};

const decodeNextToken = (
  token?: string,
): Record<string, unknown> | undefined => {
  if (!token) {
    return undefined;
  }
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const jobPk = (jobId: string): string => `JOB#${jobId}`;

export const contentPk = (contentId: string): string => `CONTENT#${contentId}`;

export const putJobMeta = async (item: JobMetaItem): Promise<void> => {
  await putItem(item);
};

export const getJobMeta = async (
  jobId: string,
): Promise<JobMetaItem | null> => {
  const raw = await getItem<JobMetaRow>({
    PK: jobPk(jobId),
    SK: "META",
  });
  if (!raw) {
    return null;
  }
  return normalizeJobMeta(raw);
};

export const getContentMeta = async (
  contentId: string,
): Promise<ContentItem | null> => {
  return getItem<ContentItem>({
    PK: contentPk(contentId),
    SK: "META",
  });
};

export const putContentMeta = async (item: ContentItem): Promise<void> => {
  await putItem(item as unknown as Record<string, unknown>);
};

export const deleteContentMeta = async (contentId: string): Promise<void> => {
  await deleteItemFromTable(getJobsTableName(), {
    PK: contentPk(contentId),
    SK: "META",
  });
};

export const updateJobMeta = async (
  jobId: string,
  fields: Record<string, unknown>,
  status?: string,
): Promise<void> => {
  const updatedAt = new Date().toISOString();
  const existing = await getJobMeta(jobId);
  const names: Record<string, string> = {
    "#updatedAt": "updatedAt",
  };
  const values: Record<string, unknown> = {
    ":updatedAt": updatedAt,
  };
  const assignments = ["#updatedAt = :updatedAt"];

  if (status) {
    names["#status"] = "status";
    names["#gsi1pk"] = "GSI1PK";
    names["#gsi1sk"] = "GSI1SK";
    values[":status"] = status;
    values[":gsi1pk"] = `STATUS#${status}`;
    values[":gsi1sk"] = updatedAt;
    assignments.push(
      "#status = :status",
      "#gsi1pk = :gsi1pk",
      "#gsi1sk = :gsi1sk",
    );
  }

  if (
    typeof fields.contentId === "string" &&
    fields.contentId.trim().length > 0
  ) {
    names["#gsi2pk"] = "GSI2PK";
    names["#gsi2sk"] = "GSI2SK";
    values[":gsi2pk"] = gsi2PkForContentId(fields.contentId);
    values[":gsi2sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi2pk = :gsi2pk", "#gsi2sk = :gsi2sk");
    /** 카탈로그 콘텐츠별 잡 목록(GSI5). contentId 변경 시 새 파티션으로 옮긴다. */
    names["#gsi5pk"] = "GSI5PK";
    names["#gsi5sk"] = "GSI5SK";
    values[":gsi5pk"] = `CONTENT#${fields.contentId}`;
    values[":gsi5sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi5pk = :gsi5pk", "#gsi5sk = :gsi5sk");
  }

  if (
    typeof fields.contentType === "string" &&
    fields.contentType.trim().length > 0
  ) {
    names["#gsi4pk"] = "GSI4PK";
    names["#gsi4sk"] = "GSI4SK";
    values[":gsi4pk"] = `CONTENT#${fields.contentType}`;
    values[":gsi4sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi4pk = :gsi4pk", "#gsi4sk = :gsi4sk");
  }

  for (const [key, value] of Object.entries(fields)) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    assignments.push(`#${key} = :${key}`);
  }

  await updateItem({
    key: {
      PK: jobPk(jobId),
      SK: "META",
    },
    updateExpression: `SET ${assignments.join(", ")}`,
    expressionAttributeNames: names,
    expressionAttributeValues: values,
  });
};

export const putSceneAsset = async (
  jobId: string,
  sceneId: number,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: `SCENE#${sceneId}`,
    sceneId,
    ...item,
  });
};

export const getSceneAsset = async (
  jobId: string,
  sceneId: number,
): Promise<SceneAssetItem | null> => {
  return getItem<SceneAssetItem>({
    PK: jobPk(jobId),
    SK: `SCENE#${sceneId}`,
  });
};

export const upsertSceneAsset = async (
  jobId: string,
  sceneId: number,
  item: Record<string, unknown>,
): Promise<void> => {
  const current = await getSceneAsset(jobId, sceneId);

  await putItem({
    ...(current ?? {
      PK: jobPk(jobId),
      SK: `SCENE#${sceneId}`,
      sceneId,
    }),
    ...item,
  });
};

export const putRenderArtifact = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: "ARTIFACT#FINAL",
    ...item,
  });
};

export const putUploadRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: "UPLOAD#YOUTUBE",
    ...item,
  });
};

export const putReviewRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: `REVIEW#${new Date().toISOString()}`,
    ...item,
  });
};

export const listJobItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  return queryItems<Record<string, unknown>>({
    keyConditionExpression: "PK = :pk",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
    },
    scanIndexForward: true,
    limit: 100,
  });
};

/** PK 아래 모든 아이템(페이지네이션 포함). */
export const listAllJobItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  const all: Record<string, unknown>[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await queryItemsPage<Record<string, unknown>>({
      keyConditionExpression: "PK = :pk",
      expressionAttributeValues: {
        ":pk": jobPk(jobId),
      },
      scanIndexForward: true,
      limit: 100,
      exclusiveStartKey,
    });
    all.push(...page.items);
    exclusiveStartKey = page.lastEvaluatedKey;
  } while (exclusiveStartKey);
  return all;
};

export const listSceneAssets = async (
  jobId: string,
): Promise<SceneAssetItem[]> => {
  const items = await queryItems<SceneAssetItem>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :scenePrefix)",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
      ":scenePrefix": "SCENE#",
    },
    scanIndexForward: true,
    limit: 100,
  });

  return items.sort((left, right) => left.sceneId - right.sceneId);
};

export const listJobMetasByStatus = async (input: {
  status: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryItemsPage<JobMetaItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :statusPk",
    expressionAttributeValues: {
      ":statusPk": `STATUS#${input.status}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
  return mapJobMetaPage({
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  });
};

/** Admin 목록: 상태별 GSI1을 병렬 조회한 뒤 updatedAt 기준으로 합쳐 최근 N건. (글로벌 정렬은 각 상태에서 최대 `limit`건까지 가져온 뒤 합치므로 근사치) */
const ALL_JOB_STATUSES_FOR_ADMIN: readonly string[] = [
  "DRAFT",
  "PLANNING",
  "PLANNED",
  "SCENE_JSON_BUILDING",
  "SCENE_JSON_READY",
  "ASSET_GENERATING",
  "ASSETS_READY",
  "VALIDATING",
  "RENDER_PLAN_READY",
  "RENDERED",
  "REVIEW_PENDING",
  "APPROVED",
  "REJECTED",
  "UPLOAD_QUEUED",
  "UPLOADED",
  "FAILED",
  "METRICS_COLLECTED",
];

export const listJobMetasMergedByRecent = async (input: {
  limit: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  if (input.nextToken) {
    return { items: [], nextToken: null };
  }
  const perStatusLimit = input.limit;
  const pages = await Promise.all(
    ALL_JOB_STATUSES_FOR_ADMIN.map((status) =>
      listJobMetasByStatus({
        status,
        limit: perStatusLimit,
        nextToken: undefined,
      }),
    ),
  );
  const byId = new Map<string, JobMetaItem>();
  for (const page of pages) {
    for (const item of page.items) {
      byId.set(item.jobId, item);
    }
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return {
    items: merged.slice(0, input.limit),
    nextToken: null,
  };
};

/** GSI2 — 레거시 식별자(비 cnt_) 또는 구버전 CHANNEL# 파티션 조회 */
export const listJobMetasByGsi2Partition = async (input: {
  partitionId: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryItemsPage<JobMetaItem>({
    indexName: "GSI2",
    keyConditionExpression: "GSI2PK = :channelPk",
    expressionAttributeValues: {
      ":channelPk": gsi2PkForContentId(input.partitionId),
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
  return mapJobMetaPage({
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  });
};

export const listJobMetasByContentType = async (input: {
  contentType: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryItemsPage<JobMetaItem>({
    indexName: "GSI4",
    keyConditionExpression: "GSI4PK = :contentPk",
    expressionAttributeValues: {
      ":contentPk": `CONTENT#${input.contentType}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
  return mapJobMetaPage({
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  });
};

/** 카탈로그 콘텐츠(contentId)에 속한 잡 메타 목록 */
export const listJobMetasByContentId = async (input: {
  contentId: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryItemsPage<JobMetaItem>({
    indexName: "GSI5",
    keyConditionExpression: "GSI5PK = :pk",
    expressionAttributeValues: {
      ":pk": `CONTENT#${input.contentId}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 50,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
  return mapJobMetaPage({
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  });
};

/** 등록된 콘텐츠(=채널) 전체 목록 */
export const listAllContentMetas = async (input: {
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<ContentItem>> => {
  const page = await queryItemsPage<ContentItem>({
    indexName: "GSI6",
    keyConditionExpression: "GSI6PK = :pk",
    expressionAttributeValues: {
      ":pk": CONTENT_CATALOG_GSI_PK,
    },
    scanIndexForward: false,
    limit: input.limit ?? 50,
    exclusiveStartKey: decodeNextToken(input.nextToken),
  });
  return {
    items: page.items,
    nextToken: encodeNextToken(page.lastEvaluatedKey),
  };
};
