import { getBufferFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { parseJsonFromLlmText } from "../../../../shared/lib/llm/parse-json-from-llm-text";
import { invokeBedrockAnthropicWithVisionJpegs } from "../../../../shared/lib/providers/llm/bedrock-vision";
import { getLlmStepSettings } from "../../../../shared/lib/store/llm-config";
import type { SourceVideoFrameExtractStoredResult } from "../../../../shared/lib/contracts/source-video-insight";
import {
  sourceVideoVisionCaptionsSchema,
} from "../../../../shared/lib/contracts/source-video-scene-json";

const VISION_CAPTIONS_LOG_KEY = (jobId: string) =>
  `logs/${jobId}/source-video-insight/vision-captions-for-scene-json.json`;

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

const runVisionCaptionsForFrames = async (input: {
  jobId: string;
  targetLanguage: string;
  extract: SourceVideoFrameExtractStoredResult;
}): Promise<unknown[]> => {
  const { jobId, targetLanguage, extract } = input;
  const frames = extract.frames;
  const images = [];
  for (const frame of frames) {
    const key = frame.imageS3Key?.trim();
    if (!key) {
      throw new Error(
        "frame JPEG S3 keys missing (already purged?); re-run runSourceVideoFrameExtract or use skipVision: true",
      );
    }
    const got = await getBufferFromS3(key);
    if (!got?.buffer?.length) {
      throw new Error(`missing frame JPEG at ${key}`);
    }
    images.push({ base64: got.buffer.toString("base64") });
  }

  const settings = await getLlmStepSettings("scene-json");
  const offsets = frames.map((f) => f.offsetSec).join(", ");
  const userText = [
    `You are given ${frames.length} JPEG frames from one source video, in chronological order.`,
    `Approximate timestamps in seconds: ${offsets}.`,
    `Return ONLY valid JSON (no markdown, no prose) with this exact shape: an array of ${frames.length} objects:`,
    `[{"offsetSec": number, "caption": "concise visible description in ${targetLanguage}"}, ...]`,
    "Each object must match the frame at the same index (first object = first image).",
    "offsetSec must copy the timestamp from the list above for that index.",
  ].join("\n");

  const { text, modelId, logS3Key } = await invokeBedrockAnthropicWithVisionJpegs({
    jobId,
    logStepKey: "source-video-scene-json-vision",
    modelId: settings.config.model,
    secretIdEnvVar: settings.config.secretIdEnvVar,
    systemPrompt:
      "You describe video keyframes for a downstream short-form script writer. Be literal about what is visible.",
    userText,
    images,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  const parsed = parseJsonFromLlmText(text);
  const rows = sourceVideoVisionCaptionsSchema.parse(parsed);
  if (rows.length !== frames.length) {
    throw new Error(
      `vision caption count ${rows.length} does not match frame count ${frames.length}`,
    );
  }
  const normalized = rows.map((row, i) => ({
    offsetSec: frames[i].offsetSec,
    caption: row.caption,
  }));

  await putJsonToS3(VISION_CAPTIONS_LOG_KEY(jobId), {
    modelId,
    visionLogS3Key: logS3Key,
    captions: normalized,
  });

  return normalized;
};

export const buildSourceVideoSceneJsonContextAppend = async (input: {
  jobId: string;
  targetLanguage: string;
  extract: SourceVideoFrameExtractStoredResult;
  skipVision?: boolean;
}): Promise<string> => {
  const manifest = buildManifestOnlyContext(input.extract);
  if (input.skipVision) {
    return manifest;
  }
  const captions = await runVisionCaptionsForFrames({
    jobId: input.jobId,
    targetLanguage: input.targetLanguage,
    extract: input.extract,
  });
  return [
    manifest,
    "",
    "Vision captions (JSON, one row per sampled frame):",
    JSON.stringify(captions, null, 2),
  ].join("\n");
};
