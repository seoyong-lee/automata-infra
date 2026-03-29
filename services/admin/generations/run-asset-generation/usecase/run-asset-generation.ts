import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { persistAssetManifestForJob } from "../repo/persist-asset-manifest";
import {
  assertModalityAllowed,
  loadAssetGenerationPolicy,
} from "../repo/load-asset-generation-policy";
import {
  loadAssetGenerationContext,
  resolveAssetGenerationInputSnapshotId,
} from "../repo/load-asset-generation-context";
import {
  isFullStrictFinalize,
  toAssetGenerationScope,
  type AssetGenerationScope,
} from "../normalize/asset-generation-scope";
import {
  finalizeSceneAssetsReadiness,
  recomputeSceneAssetsReadiness,
} from "./finalize-scene-assets-readiness";
import { runImageModalityForScenes } from "./policies/run-image-modality-for-scenes";
import { runVideoModalityForScenes } from "./policies/run-video-modality-for-scenes";
import { runVoiceModalityForScenes } from "./policies/run-voice-modality-for-scenes";
import type { ParsedRunAssetGenerationArgs } from "../normalize/parse-run-asset-generation-args";

export type { AssetGenerationScope } from "../normalize/asset-generation-scope";
export { resolveTargetVideoDurationSec } from "./policies/run-video-modality-for-scenes";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runAssetGenerationCore = async (
  jobId: string,
  scope: AssetGenerationScope = { modality: "all" },
) => {
  const { sceneJson, scenes, sceneJsonS3Key } =
    await loadAssetGenerationContext(jobId, scope);
  const policy = await loadAssetGenerationPolicy(jobId);

  await updateJobMeta(jobId, {}, "ASSET_GENERATING");
  assertModalityAllowed(scope, policy);

  if (
    (scope.modality === "all" && policy.allowImage) ||
    scope.modality === "image"
  ) {
    await runImageModalityForScenes(jobId, scenes, scope, policy);
  }
  if (
    (scope.modality === "all" && policy.allowVoice) ||
    scope.modality === "voice"
  ) {
    await runVoiceModalityForScenes(jobId, scenes);
  }
  if (
    (scope.modality === "all" && policy.allowVideo) ||
    scope.modality === "video"
  ) {
    await runVideoModalityForScenes(jobId, scenes);
  }

  await persistAssetManifestForJob({
    jobId,
    sceneJsonS3Key,
  });

  if (isFullStrictFinalize(scope)) {
    await finalizeSceneAssetsReadiness({ jobId, sceneJson });
  } else {
    await recomputeSceneAssetsReadiness({ jobId, sceneJson });
  }

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminAssetGeneration = async (
  parsed: ParsedRunAssetGenerationArgs,
  triggeredBy?: string,
) => {
  const jobId = parsed.jobId;
  const scope = toAssetGenerationScope(parsed);
  const inputSnapshotId = await resolveAssetGenerationInputSnapshotId(jobId);

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "ASSET_GENERATION",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "ASSET_GENERATION",
        assetGenScope: scope,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const job = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(job);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "ASSET_GENERATION",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runAssetGenerationCore(jobId, scope);
    await finish(
      "SUCCEEDED",
      undefined,
      result.assetManifestS3Key ?? result.sceneJsonS3Key,
    );
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
