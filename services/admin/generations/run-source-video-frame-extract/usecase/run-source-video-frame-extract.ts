import {
  sourceVideoFrameExtractFargateResultSchema,
  sourceVideoFrameExtractResultS3Key,
  type RunSourceVideoFrameExtractInput,
} from "../../../../shared/lib/contracts/source-video-insight";
import { extractSourceVideoFramesWithFargate } from "../../../../shared/lib/providers/media/fargate";
import { badUserInput } from "../../../shared/errors";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";

export const runSourceVideoFrameExtract = async (
  parsed: RunSourceVideoFrameExtractInput,
) => {
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

  const fargateResult = await extractSourceVideoFramesWithFargate({
    jobId: parsed.jobId,
    sourceVideoS3Key,
    sampleIntervalSec: parsed.sampleIntervalSec,
    maxFrames: parsed.maxFrames,
    extractionStrategy: parsed.extractionStrategy,
    sceneThreshold: parsed.sceneThreshold,
    minSceneGapSec: parsed.minSceneGapSec,
  });

  const validated = sourceVideoFrameExtractFargateResultSchema.parse(
    fargateResult,
  );

  return {
    jobId: parsed.jobId,
    sourceVideoS3Key: validated.sourceVideoS3Key,
    extractionStrategy: validated.extractionStrategy,
    sampleIntervalSec: validated.sampleIntervalSec,
    maxFrames: validated.maxFrames,
    cutTimesSec: validated.cutTimesSec ?? [],
    insightResultS3Key: sourceVideoFrameExtractResultS3Key(parsed.jobId),
    frames: validated.frames,
    provider: validated.provider,
    extractedAt: validated.extractedAt,
  };
};
