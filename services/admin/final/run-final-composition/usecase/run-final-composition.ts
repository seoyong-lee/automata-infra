import { run as runFinalCompositionStage } from "../../../../composition/final-composition";
import { run as runRenderPlanStage } from "../../../../composition/render-plan";
import { run as runValidateAssetsStage } from "../../../../composition/validate-assets";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { runAdminStageExecution } from "../../../shared/usecase/run-admin-stage-execution";
import { applyFinalCompositionScope } from "../mapper/apply-final-composition-scope";
import { loadRenderPipelineContext } from "../repo/load-render-pipeline-context";
import { persistSubtitleAss } from "../repo/persist-subtitle-ass";
import type { RenderPlan } from "../../../../../types/render/render-plan";

export type FinalCompositionScope = {
  burnInSubtitles?: boolean;
};

type FinalCompositionRuntimeContext = {
  executionSk?: string;
};

type RenderPlanResult = {
  renderPlan?: RenderPlan;
};

const noopCallback = (() => undefined) as never;
const noopContext = {} as never;

export const runFinalCompositionCore = async (
  jobId: string,
  scope?: FinalCompositionScope,
  runtime?: FinalCompositionRuntimeContext,
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

  const { effectiveBurnInSubtitles } = applyFinalCompositionScope({
    renderPlan,
    scope,
    context,
  });
  const subtitleAssS3Key = await persistSubtitleAss({
    jobId,
    renderPlan,
    burnInSubtitles: effectiveBurnInSubtitles,
  });
  const { renderPlan: finalRenderPlan } = applyFinalCompositionScope({
    renderPlan,
    scope,
    subtitleAssS3Key,
    context,
  });

  await runFinalCompositionStage(
    {
      jobId,
      renderPlan: finalRenderPlan,
      ...(runtime?.executionSk ? { executionSk: runtime.executionSk } : {}),
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
  return runAdminStageExecution({
    jobId,
    stageType: "FINAL_COMPOSITION",
    triggeredBy,
    inputSnapshotId,
    workerPayload: scope ? { finalCompositionScope: scope } : undefined,
    runCore: () => runFinalCompositionCore(jobId, scope),
    getQueuedResult: async () =>
      mapJobMetaToAdminJob(await getJobOrThrow(jobId)),
    getSuccessSnapshot: (result) =>
      result.finalVideoS3Key ?? result.previewS3Key,
  });
};
