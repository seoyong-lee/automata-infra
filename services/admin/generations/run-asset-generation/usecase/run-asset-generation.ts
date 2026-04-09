import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { runAdminStageExecution } from "../../../shared/usecase/run-admin-stage-execution";
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
import { resolveSceneImagePoolAssets } from "./resolve-scene-image-pool-assets";
import { runImageModalityForScenes } from "./policies/run-image-modality-for-scenes";
import { runVideoModalityForScenes } from "./policies/run-video-modality-for-scenes";
import { runVoiceModalityForScenes } from "./policies/run-voice-modality-for-scenes";
import type { ParsedRunAssetGenerationArgs } from "../normalize/parse-run-asset-generation-args";

export type { AssetGenerationScope } from "../normalize/asset-generation-scope";
export { resolveTargetVideoDurationSec } from "./policies/run-video-modality-for-scenes";

const shouldRunImageModality = (
  scope: AssetGenerationScope,
  policy: Awaited<ReturnType<typeof loadAssetGenerationPolicy>>,
): boolean => {
  return (
    (scope.modality === "all" && policy.allowImage) ||
    scope.modality === "image"
  );
};

const shouldRunVoiceModality = (
  scope: AssetGenerationScope,
  policy: Awaited<ReturnType<typeof loadAssetGenerationPolicy>>,
): boolean => {
  return (
    (scope.modality === "all" && policy.allowVoice) ||
    scope.modality === "voice"
  );
};

const shouldRunVideoModality = (
  scope: AssetGenerationScope,
  policy: Awaited<ReturnType<typeof loadAssetGenerationPolicy>>,
): boolean => {
  return (
    (scope.modality === "all" && policy.allowVideo) ||
    scope.modality === "video"
  );
};

const finalizeAssetGenerationState = async (input: {
  jobId: string;
  scope: AssetGenerationScope;
  sceneJson: Awaited<
    ReturnType<typeof loadAssetGenerationContext>
  >["sceneJson"];
}) => {
  if (isFullStrictFinalize(input.scope)) {
    await finalizeSceneAssetsReadiness({
      jobId: input.jobId,
      sceneJson: input.sceneJson,
    });
    return;
  }

  await recomputeSceneAssetsReadiness({
    jobId: input.jobId,
    sceneJson: input.sceneJson,
  });
};

export const runAssetGenerationCore = async (
  jobId: string,
  scope: AssetGenerationScope = { modality: "all" },
) => {
  const { sceneJson, scenes, sceneJsonS3Key } =
    await loadAssetGenerationContext(jobId, scope);
  const policy = await loadAssetGenerationPolicy(jobId);

  await updateJobMeta(jobId, {}, "ASSET_GENERATING");
  assertModalityAllowed(scope, policy);

  if (shouldRunImageModality(scope, policy)) {
    await resolveSceneImagePoolAssets(jobId, scenes);
  }

  if (shouldRunImageModality(scope, policy)) {
    await runImageModalityForScenes(jobId, scenes, scope, policy);
  }
  if (shouldRunVoiceModality(scope, policy)) {
    await runVoiceModalityForScenes(jobId, scenes, {
      runVoiceProfileIdOverride: scope.voiceProfileId,
    });
  }
  if (shouldRunVideoModality(scope, policy)) {
    await runVideoModalityForScenes(jobId, scenes);
  }

  await persistAssetManifestForJob({
    jobId,
    sceneJsonS3Key,
  });

  await finalizeAssetGenerationState({ jobId, scope, sceneJson });

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
  return runAdminStageExecution({
    jobId,
    stageType: "ASSET_GENERATION",
    triggeredBy,
    inputSnapshotId,
    workerPayload: {
      assetGenScope: scope,
      ...(scope.voiceProfileId
        ? { pipelineWorkerVoiceProfileId: scope.voiceProfileId }
        : {}),
    },
    runCore: () => runAssetGenerationCore(jobId, scope),
    getQueuedResult: async () =>
      mapJobMetaToAdminJob(await getJobOrThrow(jobId)),
    getSuccessSnapshot: (result) =>
      result.assetManifestS3Key ?? result.sceneJsonS3Key,
  });
};
