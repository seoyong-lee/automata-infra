import { putBufferToS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { run as runFinalCompositionStage } from "../../../../composition/final-composition";
import { run as runRenderPlanStage } from "../../../../composition/render-plan";
import { run as runValidateAssetsStage } from "../../../../composition/validate-assets";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import {
  buildSubtitleAss,
  hasSubtitleAssEntries,
} from "../mapper/build-subtitle-ass";
import { loadRenderPipelineContext } from "../repo/load-render-pipeline-context";
import type { RenderPlan } from "../../../../../types/render/render-plan";

export type FinalCompositionScope = {
  burnInSubtitles?: boolean;
};

type RenderPlanResult = {
  renderPlan?: RenderPlan;
};

const noopCallback = (() => undefined) as never;
const noopContext = {} as never;
const SUBTITLE_ASS_CONTENT_TYPE = "text/x-ass";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

const maybePersistSubtitleAss = async (
  jobId: string,
  renderPlan: RenderPlan,
  burnInSubtitles: boolean,
): Promise<string | undefined> => {
  if (!burnInSubtitles || !hasSubtitleAssEntries(renderPlan)) {
    return undefined;
  }
  const ass = buildSubtitleAss(renderPlan);
  if (!ass.trim()) {
    return undefined;
  }
  const key = `rendered/${jobId}/subtitles/latest.ass`;
  await putBufferToS3(key, ass, SUBTITLE_ASS_CONTENT_TYPE);
  return key;
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

  const effectiveBurnInSubtitles =
    scope?.burnInSubtitles ?? renderPlan.subtitles?.burnIn ?? false;
  const subtitleAssS3Key = await maybePersistSubtitleAss(
    jobId,
    renderPlan,
    effectiveBurnInSubtitles,
  );

  await runFinalCompositionStage(
    {
      jobId,
      renderPlan: {
        ...renderPlan,
        burnInSubtitles: effectiveBurnInSubtitles,
        subtitles: {
          ...renderPlan.subtitles,
          burnIn: effectiveBurnInSubtitles,
          ...(subtitleAssS3Key ? { assS3Key: subtitleAssS3Key } : {}),
        },
        ...(subtitleAssS3Key ? { subtitleAssS3Key } : {}),
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
