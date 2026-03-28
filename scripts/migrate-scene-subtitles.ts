import { getJsonFromS3, putJsonToS3 } from "../services/shared/lib/aws/runtime";
import {
  getJobMeta,
  listJobMetasByStatus,
  type JobMetaItem,
  upsertSceneAsset,
  updateJobMeta,
} from "../services/shared/lib/store/video-jobs";
import { alignSceneJsonNarrationAndSubtitle } from "../services/shared/lib/scene-text";
import type { SceneJson } from "../types/render/scene-json";

const ALL_JOB_STATUSES = [
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
  "READY_TO_SCHEDULE",
  "UPLOAD_QUEUED",
  "UPLOADED",
  "FAILED",
  "METRICS_COLLECTED",
] as const;

type CliOptions = {
  apply: boolean;
  all: boolean;
  jobId?: string;
  limit?: number;
  backup: boolean;
};

type MigrationResult =
  | {
      status: "updated";
      jobId: string;
      changedSceneIds: number[];
      backupKey?: string;
    }
  | {
      status: "unchanged" | "skipped";
      jobId: string;
      reason: string;
    }
  | {
      status: "failed";
      jobId: string;
      reason: string;
    };

const printUsage = (): void => {
  console.log(
    [
      "Usage:",
      "  yarn ts-node scripts/migrate-scene-subtitles.ts --jobId <jobId> [--apply] [--no-backup]",
      "  yarn ts-node scripts/migrate-scene-subtitles.ts --all [--limit <n>] [--apply] [--no-backup]",
      "",
      "Notes:",
      "  - Default mode is dry-run.",
      "  - `--apply` is required to write changes.",
      "  - Existing image/video/voice asset keys are preserved.",
    ].join("\n"),
  );
};

const parseArgs = (argv: string[]): CliOptions => {
  let apply = false;
  let all = false;
  let jobId: string | undefined;
  let limit: number | undefined;
  let backup = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--all") {
      all = true;
      continue;
    }

    if (arg === "--no-backup") {
      backup = false;
      continue;
    }

    if (arg === "--jobId") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--jobId requires a value");
      }
      jobId = value;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--limit requires a value");
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (all && jobId) {
    throw new Error("Use either --jobId or --all, not both");
  }

  if (!all && !jobId) {
    throw new Error("Either --jobId or --all is required");
  }

  return { apply, all, jobId, limit, backup };
};

const backupSceneJsonKey = (jobId: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `migrations/scene-subtitle-alignment/${jobId}/scene-json.${timestamp}.backup.json`;
};

const changedSceneIdsForAlignment = (
  current: SceneJson,
  aligned: SceneJson,
): number[] => {
  const changed: number[] = [];

  for (let index = 0; index < current.scenes.length; index += 1) {
    const before = current.scenes[index];
    const after = aligned.scenes[index];
    if (!before || !after) {
      continue;
    }
    if (
      before.narration !== after.narration ||
      before.subtitle !== after.subtitle ||
      before.disableNarration !== after.disableNarration
    ) {
      changed.push(after.sceneId);
    }
  }

  return changed;
};

const listAllJobMetas = async (limit?: number): Promise<JobMetaItem[]> => {
  const byJobId = new Map<string, JobMetaItem>();

  for (const status of ALL_JOB_STATUSES) {
    let nextToken: string | undefined;

    do {
      const page = await listJobMetasByStatus({
        status,
        limit: 100,
        nextToken,
      });

      for (const item of page.items) {
        if (!byJobId.has(item.jobId)) {
          byJobId.set(item.jobId, item);
        }
        if (limit && byJobId.size >= limit) {
          return [...byJobId.values()].slice(0, limit);
        }
      }

      nextToken = page.nextToken ?? undefined;
    } while (nextToken);
  }

  const items = [...byJobId.values()];
  return limit ? items.slice(0, limit) : items;
};

const resolveTargetJobs = async (
  options: CliOptions,
): Promise<JobMetaItem[]> => {
  if (options.jobId) {
    const job = await getJobMeta(options.jobId);
    if (!job) {
      throw new Error(`Job not found: ${options.jobId}`);
    }
    return [job];
  }

  return listAllJobMetas(options.limit);
};

const migrateJob = async (
  job: JobMetaItem,
  options: CliOptions,
): Promise<MigrationResult> => {
  const sceneJsonS3Key = job.sceneJsonS3Key?.trim();
  if (!sceneJsonS3Key) {
    return {
      status: "skipped",
      jobId: job.jobId,
      reason: "sceneJsonS3Key missing",
    };
  }

  try {
    const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
    if (!sceneJson) {
      return {
        status: "skipped",
        jobId: job.jobId,
        reason: "scene json payload not found",
      };
    }

    const alignedSceneJson = alignSceneJsonNarrationAndSubtitle(sceneJson);
    const changedSceneIds = changedSceneIdsForAlignment(
      sceneJson,
      alignedSceneJson,
    );
    if (changedSceneIds.length === 0) {
      return {
        status: "unchanged",
        jobId: job.jobId,
        reason: "already aligned",
      };
    }

    if (!options.apply) {
      return {
        status: "updated",
        jobId: job.jobId,
        changedSceneIds,
      };
    }

    let backupKey: string | undefined;
    if (options.backup) {
      backupKey = backupSceneJsonKey(job.jobId);
      await putJsonToS3(backupKey, sceneJson);
    }

    await putJsonToS3(sceneJsonS3Key, alignedSceneJson);

    for (const scene of alignedSceneJson.scenes) {
      if (!changedSceneIds.includes(scene.sceneId)) {
        continue;
      }
      await upsertSceneAsset(job.jobId, scene.sceneId, {
        narration: scene.narration,
        subtitle: scene.subtitle,
      });
    }

    await updateJobMeta(job.jobId, {
      sceneJsonS3Key,
      videoTitle: alignedSceneJson.videoTitle,
    });

    return {
      status: "updated",
      jobId: job.jobId,
      changedSceneIds,
      backupKey,
    };
  } catch (error) {
    return {
      status: "failed",
      jobId: job.jobId,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

const logResult = (result: MigrationResult, apply: boolean): void => {
  if (result.status === "updated") {
    const mode = apply ? "updated" : "would update";
    const sceneIds = result.changedSceneIds.join(", ");
    const backupLabel = result.backupKey ? ` backup=${result.backupKey}` : "";
    console.log(
      `[${mode}] job=${result.jobId} scenes=[${sceneIds}]${backupLabel}`,
    );
    return;
  }

  if (result.status === "failed") {
    console.error(`[failed] job=${result.jobId} reason=${result.reason}`);
    return;
  }

  console.log(`[${result.status}] job=${result.jobId} reason=${result.reason}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const jobs = await resolveTargetJobs(options);

  console.log(
    [
      `mode=${options.apply ? "apply" : "dry-run"}`,
      `targets=${jobs.length}`,
      options.jobId ? `jobId=${options.jobId}` : "scope=all",
      options.limit ? `limit=${options.limit}` : undefined,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await migrateJob(job, options);
    logResult(result, options.apply);

    if (result.status === "updated") {
      updated += 1;
      continue;
    }
    if (result.status === "unchanged") {
      unchanged += 1;
      continue;
    }
    if (result.status === "skipped") {
      skipped += 1;
      continue;
    }
    failed += 1;
  }

  console.log(
    `summary updated=${updated} unchanged=${unchanged} skipped=${skipped} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
