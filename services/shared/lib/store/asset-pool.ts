import { randomUUID } from "crypto";

import {
  deleteItemFromTable,
  getItem,
  putItem,
  queryItems,
  queryItemsPage,
} from "../aws/runtime";
import { getJobsTableName } from "../aws/runtime-env";
import {
  parseAssetPoolItem,
  type AssetPoolAssetType,
  type AssetPoolItem,
  type AssetPoolReviewStatus,
  type AssetPoolSourceType,
} from "../contracts/asset-pool";
import type { QueryPage } from "./video-jobs-shared";

type AssetPoolMetaItem = AssetPoolItem & {
  PK: "ASSET_POOL";
  SK: `ASSET#${string}`;
};

type AssetPoolTagItem = Pick<
  AssetPoolItem,
  | "assetId"
  | "assetType"
  | "sourceType"
  | "provider"
  | "storageKey"
  | "thumbnailKey"
  | "sourceUrl"
  | "width"
  | "height"
  | "durationSec"
  | "visualTags"
  | "moodTags"
  | "containsPeople"
  | "containsLogo"
  | "containsText"
  | "containsWatermark"
  | "qualityScore"
  | "reusabilityScore"
  | "licenseType"
  | "creatorName"
  | "attributionRequired"
  | "commercialUseAllowed"
  | "reviewStatus"
  | "ingestedAt"
  | "updatedAt"
> & {
  PK: `ASSET_POOL_TAG#${string}`;
  SK: `${Uppercase<AssetPoolAssetType>}#${Uppercase<AssetPoolItem["reviewStatus"]>}#${string}`;
  tag: string;
};

export type AssetPoolSearchHit = AssetPoolItem & {
  matchedTags: string[];
  matchedTagCount: number;
};

const ASSET_POOL_PK = "ASSET_POOL";

const assetSk = (assetId: string): `ASSET#${string}` => {
  return `ASSET#${assetId}`;
};

const normalizeTag = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const stripAssetPoolRecordKeys = <T extends { PK: string; SK: string }>(
  item: T,
): Omit<T, "PK" | "SK"> => {
  const { PK: _pk, SK: _sk, ...rest } = item;
  return rest;
};

const toSearchHit = (
  item: AssetPoolItem,
  matchedTags: string[] = [],
): AssetPoolSearchHit => {
  return {
    ...item,
    matchedTags,
    matchedTagCount: matchedTags.length,
  };
};

const toAssetPoolItem = (item: AssetPoolMetaItem): AssetPoolItem => {
  return parseAssetPoolItem(stripAssetPoolRecordKeys(item));
};

const compareIsoDatesDesc = (left?: string, right?: string): number => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
};

const encodeOffsetNextToken = (offset: number): string => {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64");
};

const decodeOffsetNextToken = (token?: string): number => {
  if (!token) {
    return 0;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as { offset?: unknown };
    return typeof decoded.offset === "number" && decoded.offset >= 0
      ? decoded.offset
      : 0;
  } catch {
    return 0;
  }
};

const collectSearchTags = (item: AssetPoolItem): string[] => {
  return Array.from(
    new Set(
      [...item.visualTags, ...item.moodTags]
        .map(normalizeTag)
        .filter((tag) => tag.length > 0),
    ),
  );
};

const buildTagPk = (tag: string): `ASSET_POOL_TAG#${string}` => {
  return `ASSET_POOL_TAG#${normalizeTag(tag)}`;
};

const buildTagSk = (input: {
  assetType: AssetPoolAssetType;
  reviewStatus: AssetPoolItem["reviewStatus"];
  assetId: string;
}): `${Uppercase<AssetPoolAssetType>}#${Uppercase<AssetPoolItem["reviewStatus"]>}#${string}` => {
  return `${input.assetType.toUpperCase() as Uppercase<AssetPoolAssetType>}#${input.reviewStatus.toUpperCase() as Uppercase<AssetPoolItem["reviewStatus"]>}#${input.assetId}`;
};

const toMetaItem = (item: AssetPoolItem): AssetPoolMetaItem => {
  return {
    PK: ASSET_POOL_PK,
    SK: assetSk(item.assetId),
    ...item,
  };
};

const toTagItems = (item: AssetPoolItem): AssetPoolTagItem[] => {
  return collectSearchTags(item).map((tag) => ({
    PK: buildTagPk(tag),
    SK: buildTagSk({
      assetType: item.assetType,
      reviewStatus: item.reviewStatus,
      assetId: item.assetId,
    }),
    tag,
    assetId: item.assetId,
    assetType: item.assetType,
    sourceType: item.sourceType,
    provider: item.provider,
    storageKey: item.storageKey,
    thumbnailKey: item.thumbnailKey,
    sourceUrl: item.sourceUrl,
    width: item.width,
    height: item.height,
    durationSec: item.durationSec,
    visualTags: item.visualTags,
    moodTags: item.moodTags,
    containsPeople: item.containsPeople,
    containsLogo: item.containsLogo,
    containsText: item.containsText,
    containsWatermark: item.containsWatermark,
    qualityScore: item.qualityScore,
    reusabilityScore: item.reusabilityScore,
    licenseType: item.licenseType,
    creatorName: item.creatorName,
    attributionRequired: item.attributionRequired,
    commercialUseAllowed: item.commercialUseAllowed,
    reviewStatus: item.reviewStatus,
    ingestedAt: item.ingestedAt,
    updatedAt: item.updatedAt,
  }));
};

const deleteExistingTagItems = async (item: AssetPoolItem): Promise<void> => {
  const tags = collectSearchTags(item);
  await Promise.all(
    tags.map((tag) =>
      deleteItemFromTable(getJobsTableName(), {
        PK: buildTagPk(tag),
        SK: buildTagSk({
          assetType: item.assetType,
          reviewStatus: item.reviewStatus,
          assetId: item.assetId,
        }),
      }),
    ),
  );
};

const listAllAssetPoolMetaItems = async (): Promise<AssetPoolItem[]> => {
  const items: AssetPoolItem[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const page = await queryItemsPage<AssetPoolMetaItem>({
      keyConditionExpression: "PK = :pk",
      expressionAttributeValues: {
        ":pk": ASSET_POOL_PK,
      },
      scanIndexForward: false,
      limit: 100,
      exclusiveStartKey: lastEvaluatedKey,
    });
    items.push(...page.items.map(toAssetPoolItem));
    lastEvaluatedKey = page.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const collectMatchedTags = (
  item: AssetPoolItem,
  requestedTags: string[],
): string[] => {
  if (requestedTags.length === 0) {
    return [];
  }
  const available = new Set(collectSearchTags(item));
  return requestedTags.filter((tag) => available.has(tag));
};

const matchesAssetPoolFilters = (
  item: AssetPoolItem,
  input: {
    assetType?: AssetPoolAssetType;
    sourceType?: AssetPoolSourceType;
    reviewStatus?: AssetPoolReviewStatus;
  },
): boolean => {
  return (
    (!input.assetType || item.assetType === input.assetType) &&
    (!input.sourceType || item.sourceType === input.sourceType) &&
    (!input.reviewStatus || item.reviewStatus === input.reviewStatus)
  );
};

const sortAssetPoolHits = (
  left: AssetPoolSearchHit,
  right: AssetPoolSearchHit,
): number => {
  if (left.matchedTagCount !== right.matchedTagCount) {
    return right.matchedTagCount - left.matchedTagCount;
  }
  return compareIsoDatesDesc(left.updatedAt, right.updatedAt);
};

const toAssetPoolItemFromTag = (item: AssetPoolTagItem): AssetPoolItem => {
  return {
    assetId: item.assetId,
    assetType: item.assetType,
    sourceType: item.sourceType,
    provider: item.provider,
    storageKey: item.storageKey,
    thumbnailKey: item.thumbnailKey,
    sourceUrl: item.sourceUrl,
    width: item.width,
    height: item.height,
    durationSec: item.durationSec,
    visualTags: item.visualTags,
    moodTags: item.moodTags,
    containsPeople: item.containsPeople,
    containsLogo: item.containsLogo,
    containsText: item.containsText,
    containsWatermark: item.containsWatermark,
    qualityScore: item.qualityScore,
    reusabilityScore: item.reusabilityScore,
    licenseType: item.licenseType,
    creatorName: item.creatorName,
    attributionRequired: item.attributionRequired,
    commercialUseAllowed: item.commercialUseAllowed,
    reviewStatus: item.reviewStatus,
    ingestedAt: item.ingestedAt,
    updatedAt: item.updatedAt,
  };
};

const appendMatchedTag = (
  merged: Map<string, AssetPoolSearchHit>,
  item: AssetPoolTagItem,
  matchedTag: string,
): void => {
  const current = merged.get(item.assetId);
  if (current) {
    if (!current.matchedTags.includes(matchedTag)) {
      current.matchedTags.push(matchedTag);
      current.matchedTagCount = current.matchedTags.length;
    }
    return;
  }

  merged.set(
    item.assetId,
    toSearchHit(toAssetPoolItemFromTag(item), [matchedTag]),
  );
};

export const buildAssetPoolItem = (
  input: Omit<AssetPoolItem, "assetId" | "ingestedAt" | "updatedAt"> & {
    assetId?: string;
    ingestedAt?: string;
    updatedAt?: string;
  },
): AssetPoolItem => {
  const now = new Date().toISOString();
  return parseAssetPoolItem({
    ...input,
    assetId: input.assetId ?? `asset_${randomUUID().replace(/-/g, "")}`,
    ingestedAt: input.ingestedAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
};

export const putAssetPoolItem = async (input: {
  item: AssetPoolItem;
}): Promise<AssetPoolItem> => {
  const item = parseAssetPoolItem(input.item);
  const existing = await getAssetPoolItem(item.assetId);
  if (existing) {
    await deleteExistingTagItems(existing);
  }

  await putItem(toMetaItem(item));
  await Promise.all(toTagItems(item).map((tagItem) => putItem(tagItem)));
  return item;
};

export const getAssetPoolItem = async (
  assetId: string,
): Promise<AssetPoolItem | null> => {
  const item = await getItem<AssetPoolMetaItem>({
    PK: ASSET_POOL_PK,
    SK: assetSk(assetId),
  });
  if (!item) {
    return null;
  }
  return toAssetPoolItem(item);
};

export const searchAssetPoolByTags = async (input: {
  assetType: AssetPoolAssetType;
  tags: string[];
  limitPerTag?: number;
}): Promise<AssetPoolSearchHit[]> => {
  const uniqueTags = Array.from(
    new Set(input.tags.map(normalizeTag).filter((tag) => tag.length > 0)),
  );
  if (uniqueTags.length === 0) {
    return [];
  }

  const merged = new Map<string, AssetPoolSearchHit>();
  const skPrefix = `${input.assetType.toUpperCase()}#APPROVED#`;
  const pages = await Promise.all(
    uniqueTags.map((tag) =>
      queryItems<AssetPoolTagItem>({
        keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        expressionAttributeValues: {
          ":pk": buildTagPk(tag),
          ":skPrefix": skPrefix,
        },
        scanIndexForward: false,
        limit: input.limitPerTag ?? 20,
      }),
    ),
  );

  for (const [index, items] of pages.entries()) {
    const matchedTag = uniqueTags[index]!;
    for (const item of items) {
      appendMatchedTag(merged, item, matchedTag);
    }
  }

  return Array.from(merged.values());
};

export const listAssetPoolItems = async (input: {
  assetType?: AssetPoolAssetType;
  sourceType?: AssetPoolSourceType;
  reviewStatus?: AssetPoolReviewStatus;
  tags?: string[];
  limit: number;
  nextToken?: string;
}): Promise<QueryPage<AssetPoolSearchHit>> => {
  const requestedTags = Array.from(
    new Set(
      (input.tags ?? []).map(normalizeTag).filter((tag) => tag.length > 0),
    ),
  );
  const allItems = await listAllAssetPoolMetaItems();
  const filtered = allItems
    .filter((item) =>
      matchesAssetPoolFilters(item, {
        assetType: input.assetType,
        sourceType: input.sourceType,
        reviewStatus: input.reviewStatus,
      }),
    )
    .map((item) => toSearchHit(item, collectMatchedTags(item, requestedTags)))
    .filter((item) =>
      requestedTags.length === 0 ? true : item.matchedTagCount > 0,
    )
    .sort(sortAssetPoolHits);

  const offset = decodeOffsetNextToken(input.nextToken);
  const items = filtered.slice(offset, offset + input.limit);
  const nextOffset = offset + items.length;

  return {
    items,
    nextToken:
      nextOffset < filtered.length ? encodeOffsetNextToken(nextOffset) : null,
  };
};
