import {
  deleteItemFromTable,
  deleteObjectFromS3,
  getJobsTableName,
} from "../../shared/lib/aws/runtime";
import { listAllJobItems } from "../../shared/lib/store/video-jobs";

const SCENE_ASSET_S3_FIELDS = [
  "imageS3Key",
  "videoClipS3Key",
  "voiceS3Key",
  "imageProviderLogS3Key",
  "videoProviderLogS3Key",
  "voiceProviderLogS3Key",
  "providerLogS3Key",
] as const;

const isSceneScopedItem = (item: Record<string, unknown>): boolean => {
  return typeof item.SK === "string" && item.SK.startsWith("SCENE#");
};

const collectSceneItemS3Keys = (item: Record<string, unknown>): string[] => {
  const keys: string[] = [];
  for (const field of SCENE_ASSET_S3_FIELDS) {
    const value = item[field];
    if (typeof value === "string" && value.length > 0) {
      keys.push(value);
    }
  }
  return keys;
};

/** Scene JSON에 더 이상 없는 sceneId에 매달린 SCENE#… 행(후보 행 포함)만 삭제 */
export const deleteSceneScopedRowsOutsideSceneIds = async (
  jobId: string,
  activeSceneIds: ReadonlySet<number>,
): Promise<void> => {
  const items = await listAllJobItems(jobId);
  const sceneItems = items.filter(isSceneScopedItem);
  const tableName = getJobsTableName();
  const s3Keys = new Set<string>();

  const orphans = sceneItems.filter((item) => {
    const sk = item.SK;
    if (typeof sk !== "string") {
      return false;
    }
    const match = /^SCENE#(\d+)/.exec(sk);
    if (!match) {
      return false;
    }
    const sceneId = Number(match[1]);
    return !activeSceneIds.has(sceneId);
  });

  for (const item of orphans) {
    for (const key of collectSceneItemS3Keys(item)) {
      s3Keys.add(key);
    }
  }

  for (const item of orphans) {
    const pk = item.PK;
    const sk = item.SK;
    if (typeof pk !== "string" || typeof sk !== "string") {
      continue;
    }
    await deleteItemFromTable(tableName, { PK: pk, SK: sk });
  }

  for (const key of s3Keys) {
    try {
      await deleteObjectFromS3(key);
    } catch {
      // best-effort cleanup
    }
  }
};

export const clearSceneAssets = async (jobId: string): Promise<void> => {
  const items = await listAllJobItems(jobId);
  const sceneItems = items.filter(isSceneScopedItem);
  const tableName = getJobsTableName();
  const s3Keys = new Set<string>();

  for (const item of sceneItems) {
    for (const key of collectSceneItemS3Keys(item)) {
      s3Keys.add(key);
    }
  }

  for (const item of sceneItems) {
    const pk = item.PK;
    const sk = item.SK;
    if (typeof pk !== "string" || typeof sk !== "string") {
      continue;
    }
    await deleteItemFromTable(tableName, { PK: pk, SK: sk });
  }

  for (const key of s3Keys) {
    try {
      await deleteObjectFromS3(key);
    } catch {
      // best-effort cleanup
    }
  }
};
