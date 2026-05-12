import type { SourceVideoFrameExtractStoredResult } from "../../../../shared/lib/contracts/source-video-insight";
import type { SourceVideoVisionProvider } from "../../../../shared/lib/contracts/source-video-vision";
import { runVisionCaptionsForSourceVideoFrames } from "./run-vision-captions-for-source-video-frames";

const buildManifestOnlyContext = (
  extract: SourceVideoFrameExtractStoredResult,
): string => {
  const manifestOnly = {
    extractionStrategy: extract.extractionStrategy,
    sampleIntervalSec: extract.sampleIntervalSec,
    maxFrames: extract.maxFrames,
    cutTimesSec: extract.cutTimesSec ?? [],
    frames: extract.frames.map((f) => ({
      offsetSec: f.offsetSec,
      ...(f.imageS3Key?.trim() ? { imageS3Key: f.imageS3Key.trim() } : {}),
    })),
  };
  return [
    "The following JPEG keys were sampled from the user's source video (S3 keys in the assets bucket).",
    "Use timestamps and paths as anchors when writing scene narration, imagePrompt, and videoPrompt.",
    JSON.stringify(manifestOnly, null, 2),
  ].join("\n");
};

export const buildSourceVideoSceneJsonContextAppend = async (input: {
  jobId: string;
  targetLanguage: string;
  extract: SourceVideoFrameExtractStoredResult;
  skipVision?: boolean;
  visionProvider?: SourceVideoVisionProvider;
}): Promise<string> => {
  const manifest = buildManifestOnlyContext(input.extract);
  if (input.skipVision) {
    return manifest;
  }
  const captions = await runVisionCaptionsForSourceVideoFrames({
    jobId: input.jobId,
    targetLanguage: input.targetLanguage,
    extract: input.extract,
    visionProviderOverride: input.visionProvider,
  });
  return [
    manifest,
    "",
    "Vision captions (JSON, one row per sampled frame):",
    JSON.stringify(captions, null, 2),
  ].join("\n");
};
