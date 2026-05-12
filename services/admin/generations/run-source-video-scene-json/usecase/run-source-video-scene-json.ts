import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { runAdminStageExecution } from "../../../shared/usecase/run-admin-stage-execution";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import {
  loadSceneJsonBuildInput,
  resolveSceneJsonInputSnapshotId,
} from "../../run-scene-json/repo/load-scene-json-build-input";
import {
  markSceneJsonBuilding,
  persistGeneratedSceneJson,
} from "../../run-scene-json/repo/persist-generated-scene-json";
import { badUserInput } from "../../../shared/errors";
import { loadValidatedFrameExtractResult } from "../repo/load-frame-extract-result";
import {
  purgeSourceVideoInsightFrameJpegsAfterSceneJson,
  resolveInsightResultS3Key,
} from "../repo/purge-source-video-insight-frame-jpegs";
import { buildSourceVideoSceneJsonContextAppend } from "./build-source-video-scene-json-context";
import type { RunSourceVideoSceneJsonInput } from "../../../../shared/lib/contracts/source-video-scene-json";

export const runSourceVideoSceneJsonCore = async (
  parsed: RunSourceVideoSceneJsonInput,
) => {
  const insightResultS3Key = resolveInsightResultS3Key(
    parsed.jobId,
    parsed.insightResultS3Key,
  );
  const extract = await loadValidatedFrameExtractResult({
    jobId: parsed.jobId,
    insightResultS3Key: parsed.insightResultS3Key,
  });

  if (!parsed.skipVision) {
    const hasFrameKeys = extract.frames.some((f) => Boolean(f.imageS3Key?.trim()));
    if (!hasFrameKeys) {
      throw badUserInput(
        "frame JPEGs are missing from the extract manifest (already purged?); use skipVision: true or runSourceVideoFrameExtract again",
      );
    }
  }

  const { sceneJsonInput } = await loadSceneJsonBuildInput(parsed.jobId);
  await markSceneJsonBuilding(parsed.jobId);

  const contextAppend = await buildSourceVideoSceneJsonContextAppend({
    jobId: parsed.jobId,
    targetLanguage: sceneJsonInput.targetLanguage,
    extract,
    skipVision: parsed.skipVision === true,
  });

  const sceneJson = await buildSceneJson(sceneJsonInput, {}, {
    sourceVideoFrameContextAppend: contextAppend,
  });
  await persistGeneratedSceneJson(parsed.jobId, sceneJson);

  if (parsed.retainFrameJpegs !== true) {
    await purgeSourceVideoInsightFrameJpegsAfterSceneJson({
      jobId: parsed.jobId,
      insightResultS3Key,
      extract,
    });
  }

  const updated = await getJobOrThrow(parsed.jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminSourceVideoSceneJson = async (
  parsed: RunSourceVideoSceneJsonInput,
  triggeredBy?: string,
) => {
  const inputSnapshotId = await resolveSceneJsonInputSnapshotId(parsed.jobId);
  return runAdminStageExecution({
    jobId: parsed.jobId,
    stageType: "SCENE_JSON",
    triggeredBy,
    inputSnapshotId,
    runCore: () => runSourceVideoSceneJsonCore(parsed),
    getQueuedResult: async () =>
      mapJobMetaToAdminJob(await getJobOrThrow(parsed.jobId)),
    getSuccessSnapshot: (result) => result.sceneJsonS3Key,
  });
};
