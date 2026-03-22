import {
  getJsonFromS3,
  putBufferToS3,
} from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { listSceneAssets } from "../../../../shared/lib/store/video-jobs";
import { run as runFinalCompositionStage } from "../../../../composition/final-composition";
import { run as runRenderPlanStage } from "../../../../composition/render-plan";
import { run as runValidateAssetsStage } from "../../../../composition/validate-assets";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";

import type { SceneJson } from "../../../../../types/render/scene-json";

type RenderPipelineContext = {
  jobId: string;
  sceneJson: SceneJson;
  imageAssets: Array<{ sceneId: number; imageS3Key?: string }>;
  videoAssets: Array<{ sceneId: number; videoClipS3Key?: string }>;
  voiceAssets: Array<{ sceneId: number; voiceS3Key?: string }>;
  backgroundMusicS3Key?: string;
};

export type FinalCompositionScope = {
  burnInSubtitles?: boolean;
};

type RenderPlanResult = {
  renderPlan?: Record<string, unknown> & {
    totalDurationSec?: number;
    scenes?: Array<{
      startSec?: number;
      endSec?: number;
      subtitle?: string;
    }>;
  };
};

const noopCallback = (() => undefined) as never;
const noopContext = {} as never;
const SUBTITLE_SRT_CONTENT_TYPE = "application/x-subrip";
const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

const formatSrtTimestamp = (seconds: number): string => {
  const safeMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const secs = Math.floor((safeMs % 60_000) / 1000);
  const millis = safeMs % 1000;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":") +
    `,${String(millis).padStart(3, "0")}`;
};

const buildSubtitleSrt = (
  scenes: Array<{ startSec?: number; endSec?: number; subtitle?: string }>,
): string => {
  const entries = scenes
    .map((scene) => ({
      startSec: typeof scene.startSec === "number" ? scene.startSec : 0,
      endSec: typeof scene.endSec === "number" ? scene.endSec : 0,
      subtitle:
        typeof scene.subtitle === "string" ? scene.subtitle.trim() : "",
    }))
    .filter(
      (scene) =>
        scene.subtitle.length > 0 && scene.endSec > scene.startSec,
    );

  return entries
    .map(
      (scene, index) =>
        `${index + 1}\n${formatSrtTimestamp(scene.startSec)} --> ${formatSrtTimestamp(scene.endSec)}\n${scene.subtitle}`,
    )
    .join("\n\n");
};

const maybePersistSubtitleSrt = async (
  jobId: string,
  renderPlan: RenderPlanResult["renderPlan"],
  burnInSubtitles: boolean | undefined,
): Promise<string | undefined> => {
  if (!burnInSubtitles || !renderPlan?.scenes) {
    return undefined;
  }
  const srt = buildSubtitleSrt(renderPlan.scenes);
  if (!srt.trim()) {
    return undefined;
  }
  const key = `rendered/${jobId}/subtitles/latest.srt`;
  await putBufferToS3(key, srt, SUBTITLE_SRT_CONTENT_TYPE);
  return key;
};

const loadRenderPipelineContext = async (
  jobId: string,
): Promise<RenderPipelineContext> => {
  const job = await getJobOrThrow(jobId);
  const sceneJsonS3Key = job.sceneJsonS3Key?.trim();
  if (!sceneJsonS3Key) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  const sceneAssets = await listSceneAssets(jobId);

  return {
    jobId,
    sceneJson,
    imageAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      imageS3Key:
        typeof asset.imageS3Key === "string" ? asset.imageS3Key : undefined,
    })),
    videoAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      videoClipS3Key:
        typeof asset.videoClipS3Key === "string"
          ? asset.videoClipS3Key
          : undefined,
    })),
    voiceAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      voiceS3Key:
        typeof asset.voiceS3Key === "string" ? asset.voiceS3Key : undefined,
    })),
    backgroundMusicS3Key:
      typeof job.backgroundMusicS3Key === "string"
        ? job.backgroundMusicS3Key
        : undefined,
  };
};

export const runFinalCompositionCore = async (
  jobId: string,
  scope?: FinalCompositionScope,
): Promise<ReturnType<typeof mapJobMetaToAdminJob>> => {
  const context = await loadRenderPipelineContext(jobId);

  await runValidateAssetsStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  );

  const renderPlanResult = (await runRenderPlanStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  )) as RenderPlanResult;

  const renderPlan = renderPlanResult.renderPlan;
  if (!renderPlan || typeof renderPlan !== "object") {
    throw new Error("render plan not created");
  }
  const subtitleSrtS3Key = await maybePersistSubtitleSrt(
    jobId,
    renderPlan,
    scope?.burnInSubtitles,
  );

  await runFinalCompositionStage(
    {
      jobId,
      renderPlan: {
        ...(renderPlan as Record<string, unknown> & {
          totalDurationSec: number;
        }),
        ...(scope?.burnInSubtitles !== undefined
          ? { burnInSubtitles: scope.burnInSubtitles }
          : {}),
        ...(subtitleSrtS3Key ? { subtitleSrtS3Key } : {}),
        ...(context.backgroundMusicS3Key
          ? { soundtrackSrc: context.backgroundMusicS3Key }
          : {}),
      },
    },
    noopContext,
    noopCallback,
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminFinalComposition = async (
  jobId: string,
  triggeredBy?: string,
  scope?: FinalCompositionScope,
): Promise<ReturnType<typeof mapJobMetaToAdminJob>> => {
  const job = await getJobOrThrow(jobId);
  const inputSnapshotId =
    job.assetManifestS3Key ?? job.sceneJsonS3Key ?? undefined;

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "FINAL_COMPOSITION",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "FINAL_COMPOSITION",
        ...(scope ? { finalCompositionScope: scope } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const refreshed = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(refreshed);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "FINAL_COMPOSITION",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runFinalCompositionCore(jobId, scope);
    await finish(
      "SUCCEEDED",
      undefined,
      result.finalVideoS3Key ?? result.previewS3Key,
    );
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
