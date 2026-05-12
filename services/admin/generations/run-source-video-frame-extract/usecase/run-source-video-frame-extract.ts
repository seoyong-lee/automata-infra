import {
  sourceVideoFrameExtractFargateResultSchema,
  sourceVideoFrameExtractResultS3Key,
  type RunSourceVideoFrameExtractInput,
  type SourceVideoFrameExtractionStrategy,
} from "../../../../shared/lib/contracts/source-video-insight";
import { invokeSourceVideoFrameExtractWorkerAsync } from "../../../../shared/lib/aws/invoke-source-video-frame-extract-worker";
import { extractSourceVideoFramesWithFargate } from "../../../../shared/lib/providers/media/fargate";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { badUserInput } from "../../../shared/errors";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";

export type SourceVideoFrameExtractQueuedResult = {
  jobId: string;
  sourceVideoS3Key: string;
  extractionStrategy: SourceVideoFrameExtractionStrategy;
  insightResultS3Key: string;
  sourceVideoFrameExtractStatus: "EXTRACTING";
};

const resolveSourceVideoS3Key = async (
  parsed: RunSourceVideoFrameExtractInput,
): Promise<string> => {
  const job = await getJobOrThrow(parsed.jobId);
  const sourceVideoS3Key =
    parsed.sourceVideoS3Key?.trim() ||
    (typeof job.masterVideoS3Key === "string"
      ? job.masterVideoS3Key.trim()
      : "");
  if (!sourceVideoS3Key) {
    throw badUserInput(
      "source video is required: set master video on the job or pass sourceVideoS3Key",
    );
  }
  return sourceVideoS3Key;
};

/**
 * AppSync 동기 한도를 피하기 위해 메타를 EXTRACTING으로 두고 워커 Lambda(Event)로 Fargate를 넘긴다.
 */
export const requestSourceVideoFrameExtract = async (
  parsed: RunSourceVideoFrameExtractInput,
): Promise<SourceVideoFrameExtractQueuedResult> => {
  const sourceVideoS3Key = await resolveSourceVideoS3Key(parsed);
  const insightResultS3Key = sourceVideoFrameExtractResultS3Key(parsed.jobId);
  const extractionStrategy: SourceVideoFrameExtractionStrategy =
    parsed.extractionStrategy ?? "UNIFORM";
  const startedAt = new Date().toISOString();
  await updateJobMeta(parsed.jobId, {
    sourceVideoFrameExtractStatus: "EXTRACTING",
    sourceVideoFrameExtractStartedAt: startedAt,
    sourceVideoFrameExtractCompletedAt: null,
    sourceVideoFrameExtractError: null,
    sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
  });

  try {
    await invokeSourceVideoFrameExtractWorkerAsync(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobMeta(parsed.jobId, {
      sourceVideoFrameExtractStatus: "FAILED",
      sourceVideoFrameExtractCompletedAt: new Date().toISOString(),
      sourceVideoFrameExtractError: message.slice(0, 2000),
      sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
    });
    throw error;
  }

  return {
    jobId: parsed.jobId,
    sourceVideoS3Key,
    extractionStrategy,
    insightResultS3Key,
    sourceVideoFrameExtractStatus: "EXTRACTING",
  };
};

/**
 * 워커 전용. 실패 시 잡 메타만 FAILED로 두고 예외는 삼킨다(Event invoke 재시도 혼선 방지).
 */
export const executeSourceVideoFrameExtract = async (
  parsed: RunSourceVideoFrameExtractInput,
): Promise<void> => {
  const insightResultS3Key = sourceVideoFrameExtractResultS3Key(parsed.jobId);

  let job;
  try {
    job = await getJobOrThrow(parsed.jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobMeta(parsed.jobId, {
      sourceVideoFrameExtractStatus: "FAILED",
      sourceVideoFrameExtractCompletedAt: new Date().toISOString(),
      sourceVideoFrameExtractError: message.slice(0, 2000),
      sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
    });
    return;
  }

  const sourceVideoS3Key =
    parsed.sourceVideoS3Key?.trim() ||
    (typeof job.masterVideoS3Key === "string"
      ? job.masterVideoS3Key.trim()
      : "");
  if (!sourceVideoS3Key) {
    await updateJobMeta(parsed.jobId, {
      sourceVideoFrameExtractStatus: "FAILED",
      sourceVideoFrameExtractCompletedAt: new Date().toISOString(),
      sourceVideoFrameExtractError:
        "source video is required: set master video on the job or pass sourceVideoS3Key",
      sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
    });
    return;
  }

  try {
    const fargateResult = await extractSourceVideoFramesWithFargate({
      jobId: parsed.jobId,
      sourceVideoS3Key,
      sampleIntervalSec: parsed.sampleIntervalSec,
      maxFrames: parsed.maxFrames,
      extractionStrategy: parsed.extractionStrategy,
      sceneThreshold: parsed.sceneThreshold,
      minSceneGapSec: parsed.minSceneGapSec,
    });

    sourceVideoFrameExtractFargateResultSchema.parse(fargateResult);

    await updateJobMeta(parsed.jobId, {
      sourceVideoFrameExtractStatus: "READY",
      sourceVideoFrameExtractCompletedAt: new Date().toISOString(),
      sourceVideoFrameExtractError: null,
      sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobMeta(parsed.jobId, {
      sourceVideoFrameExtractStatus: "FAILED",
      sourceVideoFrameExtractCompletedAt: new Date().toISOString(),
      sourceVideoFrameExtractError: message.slice(0, 2000),
      sourceVideoFrameExtractInsightS3Key: insightResultS3Key,
    });
  }
};
