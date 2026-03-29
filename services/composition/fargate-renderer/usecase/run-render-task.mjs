import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  resolveCanvasSettings,
  resolveMediaFrameSettings,
  resolveOutput,
  resolveSubtitleSettings,
  toFfmpegColor,
  seconds,
} from "../normalize/render-plan.mjs";
import { createRenderTaskResult } from "../mapper/render-result.mjs";
import {
  createPreview,
  createThumbnail,
  concatSegments,
  maybeDownloadSoundtrack,
  mixSoundtrack,
} from "./finalize-render-output.mjs";
import {
  sceneDuration,
  subtitlesFilter,
  writeSceneAss,
} from "./scene-ass.mjs";

function visualFilter(outputSettings, canvasSettings, mediaFrameSettings, assPath) {
  const backgroundColor = toFfmpegColor(canvasSettings.backgroundColor);
  const videoScale = canvasSettings.videoScale;
  const cropMode = canvasSettings.videoCropMode;
  const frameWidth = Math.max(
    2,
    Math.round(outputSettings.width * mediaFrameSettings.width),
  );
  const frameHeight = Math.max(
    2,
    Math.round(outputSettings.height * mediaFrameSettings.height),
  );
  const frameX = Math.max(
    0,
    Math.round(outputSettings.width * mediaFrameSettings.x),
  );
  const frameY = Math.max(
    0,
    Math.round(outputSettings.height * mediaFrameSettings.y),
  );
  const containScale = Math.min(videoScale, 1);
  const scaledWidth = Math.max(
    2,
    Math.round(frameWidth * (cropMode === "contain" ? containScale : videoScale)),
  );
  const scaledHeight = Math.max(
    2,
    Math.round(frameHeight * (cropMode === "contain" ? containScale : videoScale)),
  );
  const filters =
    cropMode === "contain"
      ? [
          `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=decrease`,
          `pad=${frameWidth}:${frameHeight}:(ow-iw)/2:(oh-ih)/2:${backgroundColor}`,
          `pad=${outputSettings.width}:${outputSettings.height}:${frameX}:${frameY}:${backgroundColor}`,
          `fps=${outputSettings.fps}`,
        ]
      : videoScale >= 1
        ? [
            `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase`,
            `crop=${frameWidth}:${frameHeight}`,
            `pad=${outputSettings.width}:${outputSettings.height}:${frameX}:${frameY}:${backgroundColor}`,
            `fps=${outputSettings.fps}`,
          ]
        : [
            `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase`,
            `crop=${scaledWidth}:${scaledHeight}`,
            `pad=${frameWidth}:${frameHeight}:(ow-iw)/2:(oh-ih)/2:${backgroundColor}`,
            `pad=${outputSettings.width}:${outputSettings.height}:${frameX}:${frameY}:${backgroundColor}`,
            `fps=${outputSettings.fps}`,
          ];
  if (assPath) {
    filters.push(subtitlesFilter(assPath));
  }
  return filters.join(",");
}

async function createSceneSegment(input) {
  const {
    jobId,
    scene,
    workDir,
    outputSettings,
    subtitleSettings,
    canvasSettings,
    mediaFrameSettings,
    overlays,
    storageRepo,
    mediaToolsRepo,
  } = input;
  const durationSec = sceneDuration(scene);
  const segmentPath = path.join(workDir, `scene-${scene.sceneId}.mp4`);
  const assPath = path.join(workDir, `scene-${scene.sceneId}.ass`);
  const hasAss = await writeSceneAss(
    scene,
    subtitleSettings,
    outputSettings,
    assPath,
    overlays,
  );
  const vf = visualFilter(
    outputSettings,
    canvasSettings,
    mediaFrameSettings,
    hasAss ? assPath : "",
  );
  const voiceKey = typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : "";
  const voicePath = path.join(
    workDir,
    `voice-${scene.sceneId}${path.extname(voiceKey) || ".mp3"}`,
  );
  const hasVoice = Boolean(voiceKey);
  if (hasVoice) {
    await storageRepo.downloadObject(voiceKey, voicePath);
  }
  try {
    if (typeof scene.videoClipS3Key === "string" && scene.videoClipS3Key) {
      const videoPath = path.join(
        workDir,
        `visual-${scene.sceneId}${path.extname(scene.videoClipS3Key) || ".mp4"}`,
      );
      await storageRepo.downloadObject(scene.videoClipS3Key, videoPath);
      await mediaToolsRepo.runCommand("ffmpeg", [
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        videoPath,
        ...(hasVoice
          ? ["-i", voicePath]
          : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
        ...(hasVoice
          ? ["-filter_complex", `[1:a]apad=pad_dur=${durationSec}[aout]`]
          : []),
        "-vf",
        vf,
        "-map",
        "0:v:0",
        "-map",
        hasVoice ? "[aout]" : "1:a:0",
        "-t",
        String(durationSec),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        segmentPath,
      ]);
      return segmentPath;
    }
    if (typeof scene.imageS3Key === "string" && scene.imageS3Key) {
      const imagePath = path.join(
        workDir,
        `visual-${scene.sceneId}${path.extname(scene.imageS3Key) || ".png"}`,
      );
      await storageRepo.downloadObject(scene.imageS3Key, imagePath);
      await mediaToolsRepo.runCommand("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        ...(hasVoice
          ? ["-i", voicePath]
          : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
        ...(hasVoice
          ? ["-filter_complex", `[1:a]apad=pad_dur=${durationSec}[aout]`]
          : []),
        "-vf",
        vf,
        "-map",
        "0:v:0",
        "-map",
        hasVoice ? "[aout]" : "1:a:0",
        "-t",
        String(durationSec),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        segmentPath,
      ]);
      return segmentPath;
    }
  } catch (error) {
    await storageRepo.putJson(
      `logs/${jobId}/composition/fargate-segment-${scene.sceneId}.json`,
      {
        sceneId: scene.sceneId,
        fallback: true,
        reason: error instanceof Error ? error.message : String(error),
      },
    );
  }
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${toFfmpegColor(canvasSettings.backgroundColor)}:s=${outputSettings.width}x${outputSettings.height}:r=${outputSettings.fps}`,
    ...(hasVoice
      ? ["-i", voicePath]
      : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
    ...(hasVoice
      ? ["-filter_complex", `[1:a]apad=pad_dur=${durationSec}[aout]`]
      : []),
    "-vf",
    hasAss ? subtitlesFilter(assPath) : "null",
    "-map",
    "0:v:0",
    "-map",
    hasVoice ? "[aout]" : "1:a:0",
    "-t",
    String(durationSec),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    segmentPath,
  ]);
  return segmentPath;
}

async function createGapSegment(input) {
  const {
    jobId,
    index,
    durationSec,
    workDir,
    outputSettings,
    canvasSettings,
    previousSegmentPath,
    storageRepo,
    mediaToolsRepo,
  } = input;
  const gapPath = path.join(workDir, `gap-${index}.mp4`);
  if (previousSegmentPath) {
    const freezeFramePath = path.join(workDir, `gap-${index}-freeze.png`);
    try {
      await mediaToolsRepo.runCommand("ffmpeg", [
        "-y",
        "-sseof",
        "-0.04",
        "-i",
        previousSegmentPath,
        "-frames:v",
        "1",
        freezeFramePath,
      ]);
      await mediaToolsRepo.runCommand("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-i",
        freezeFramePath,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf",
        `fps=${outputSettings.fps}`,
        "-t",
        String(seconds(durationSec)),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        gapPath,
      ]);
      return gapPath;
    } catch (error) {
      await storageRepo.putJson(`logs/${jobId}/composition/fargate-gap-${index}.json`, {
        sceneId: index,
        fallback: "solid-color",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${toFfmpegColor(canvasSettings.backgroundColor)}:s=${outputSettings.width}x${outputSettings.height}:r=${outputSettings.fps}`,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-t",
    String(seconds(durationSec)),
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    gapPath,
  ]);
  return gapPath;
}

export async function runRenderTask(input) {
  const {
    jobId,
    renderPlanS3Key,
    storageRepo,
    mediaToolsRepo,
    now = () => new Date().toISOString(),
  } = input;

  const renderPlan = await storageRepo.getJson(renderPlanS3Key);
  const outputSettings = resolveOutput(renderPlan);
  const canvasSettings = resolveCanvasSettings(renderPlan);
  const mediaFrameSettings = resolveMediaFrameSettings(renderPlan);
  const subtitleSettings = resolveSubtitleSettings(renderPlan);
  const workDir = await fs.mkdtemp(path.join(tmpdir(), `render-${jobId}-`));
  const segmentInputs = [];

  for (const scene of renderPlan.scenes ?? []) {
    const durationSec = sceneDuration(scene);
    const segmentPath = await createSceneSegment({
      jobId,
      scene,
      workDir,
      outputSettings,
      subtitleSettings,
      canvasSettings,
      mediaFrameSettings,
      overlays: renderPlan.overlays,
      storageRepo,
      mediaToolsRepo,
    });
    segmentInputs.push({
      scene,
      segmentPath,
      durationSec,
    });
  }

  if (!segmentInputs.length) {
    throw new Error("Render plan has no scenes to compose");
  }

  const concatenatedPath = path.join(workDir, "combined.mp4");
  const finalVideoPath = path.join(workDir, "final.mp4");
  const previewPath = path.join(workDir, "preview.mp4");
  const thumbnailPath = path.join(workDir, "thumbnail.jpg");

  await concatSegments(segmentInputs, workDir, concatenatedPath, mediaToolsRepo);
  const soundtrackPath = await maybeDownloadSoundtrack(
    renderPlan,
    workDir,
    storageRepo,
  );
  await mixSoundtrack(
    concatenatedPath,
    soundtrackPath,
    Number(renderPlan.totalDurationSec ?? 1),
    finalVideoPath,
    mediaToolsRepo,
  );
  await createPreview(finalVideoPath, renderPlan, previewPath, mediaToolsRepo);
  await createThumbnail(finalVideoPath, renderPlan, thumbnailPath, mediaToolsRepo);

  const renderedAt = now();
  const renderId = renderedAt.replaceAll(":", "-").replaceAll(".", "-");
  const result = createRenderTaskResult({
    jobId,
    renderId,
    renderedAt,
  });

  await storageRepo.uploadFile(result.finalVideoS3Key, finalVideoPath, "video/mp4");
  await storageRepo.uploadFile(result.previewS3Key, previewPath, "video/mp4");
  await storageRepo.uploadFile(
    result.thumbnailS3Key,
    thumbnailPath,
    "image/jpeg",
  );

  return result;
}
