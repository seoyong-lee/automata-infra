import { S3Client } from "@aws-sdk/client-s3";
import { createS3CompositionRepo } from "./repo/s3-composition-repo.mjs";
import {
  ffprobeVideoSummary,
  getMediaDurationSec,
  runCommand,
} from "./repo/media-tools-repo.mjs";
import { createRenderFailureResult } from "./mapper/render-result.mjs";
import { extractYoutubeTranscript } from "./usecase/extract-youtube-transcript.mjs";
import { postProcessVoice } from "./usecase/post-process-voice.mjs";
import { runRenderTask } from "./usecase/run-render-task.mjs";

const region = process.env.AWS_REGION ?? "ap-northeast-2";
const bucketName = requireEnv("ASSETS_BUCKET_NAME");
const resultS3Key = requireEnv("RESULT_S3_KEY");
const jobId = requireEnv("JOB_ID");
const taskMode = process.env.TASK_MODE?.trim() || "RENDER";
const s3 = new S3Client({ region });
const storageRepo = createS3CompositionRepo({ s3, bucketName });
const mediaToolsRepo = {
  getMediaDurationSec,
  runCommand,
  ffprobeVideoSummary,
};

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function runSelectedTask() {
  if (taskMode === "YOUTUBE_TRANSCRIPT") {
    return extractYoutubeTranscript({
      jobId,
      sceneId: process.env.SCENE_ID ? Number(requireEnv("SCENE_ID")) : undefined,
      transcriptId: process.env.TRANSCRIPT_ID?.trim() || undefined,
      youtubeUrl: requireEnv("YOUTUBE_URL"),
      preferredLanguage: process.env.PREFERRED_LANGUAGE?.trim() || undefined,
      storageRepo,
    });
  }

  if (taskMode === "VOICE_POSTPROCESS") {
    return postProcessVoice({
      jobId,
      inputAudioS3Key: requireEnv("INPUT_AUDIO_S3_KEY"),
      outputAudioS3Key: requireEnv("OUTPUT_AUDIO_S3_KEY"),
      targetDurationSec: Number(requireEnv("TARGET_DURATION_SEC")),
      inputDurationSec: Number(process.env.INPUT_DURATION_SEC ?? "0"),
      storageRepo,
      mediaToolsRepo,
    });
  }

  return runRenderTask({
    jobId,
    renderPlanS3Key: requireEnv("RENDER_PLAN_S3_KEY"),
    storageRepo,
    mediaToolsRepo,
  });
}

async function main() {
  const result = await runSelectedTask();
  await storageRepo.putJson(resultS3Key, result);
}

function getFailureProvider(taskMode) {
  if (taskMode === "YOUTUBE_TRANSCRIPT") {
    return "fargate-yt-dlp";
  }
  if (taskMode === "VOICE_POSTPROCESS") {
    return "fargate-ffmpeg-atempo";
  }
  return "fargate-ffmpeg";
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await storageRepo.putJson(
    resultS3Key,
    createRenderFailureResult({
      message,
      renderedAt: new Date().toISOString(),
      provider: getFailureProvider(taskMode),
    }),
  );
  process.exitCode = 1;
});
