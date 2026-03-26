import {
  deleteItemFromTable,
  deleteObjectFromS3,
  getJobsTableName,
} from "../../../../shared/lib/aws/runtime";
import {
  getJobMeta,
  listAllJobItems,
  type JobMetaItem,
} from "../../../../shared/lib/store/video-jobs";
import { conflict, notFound } from "../../shared/errors";

const BLOCKED_DELETE_STATUSES = new Set<string>([
  "UPLOADED",
  "METRICS_COLLECTED",
  "UPLOAD_QUEUED",
  "REVIEW_PENDING",
]);

const META_S3_FIELDS: (keyof JobMetaItem)[] = [
  "jobBriefS3Key",
  "contentBriefS3Key",
  "jobPlanS3Key",
  "sceneJsonS3Key",
  "assetManifestS3Key",
  "renderPlanS3Key",
  "finalVideoS3Key",
  "thumbnailS3Key",
  "previewS3Key",
  "backgroundMusicS3Key",
];

const SCENE_S3_FIELDS = ["imageS3Key", "videoClipS3Key", "voiceS3Key"] as const;

const collectKeysFromMeta = (meta: JobMetaItem): string[] => {
  const keys: string[] = [];
  for (const field of META_S3_FIELDS) {
    const value = meta[field];
    if (typeof value === "string" && value.length > 0) {
      keys.push(value);
    }
  }
  return keys;
};

const collectKeysFromItem = (item: Record<string, unknown>): string[] => {
  const keys: string[] = [];
  for (const field of SCENE_S3_FIELDS) {
    const value = item[field];
    if (typeof value === "string" && value.length > 0) {
      keys.push(value);
    }
  }
  return keys;
};

export const deleteAdminJobRecord = async (
  jobId: string,
  options?: { skipStatusCheck?: boolean },
): Promise<{ ok: true; jobId: string }> => {
  const meta = await getJobMeta(jobId);
  if (!meta) {
    throw notFound("job not found");
  }

  if (!options?.skipStatusCheck && BLOCKED_DELETE_STATUSES.has(meta.status)) {
    throw conflict(
      `cannot delete job in status ${meta.status}; finish or cancel pipeline first`,
    );
  }

  const items = await listAllJobItems(jobId);
  const s3Keys = new Set<string>([...collectKeysFromMeta(meta)]);
  for (const item of items) {
    for (const key of collectKeysFromItem(item)) {
      s3Keys.add(key);
    }
  }

  const tableName = getJobsTableName();

  for (const item of items) {
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

  return { ok: true, jobId };
};
