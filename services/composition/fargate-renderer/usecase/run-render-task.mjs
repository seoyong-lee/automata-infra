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
import {
  buildImageOverlayFilterComplex,
  prepareSceneImageOverlays,
  sceneImageOverlaySceneKey,
  visualBaseFilter,
} from "./image-scene-overlays.mjs";

const VOICE_TAIL_PAD_SEC = 0.15;
/** Silence before TTS starts (avoids perceived fade-in at scene cut). */
const TTS_LEAD_IN_SEC = 0.5;

function voiceInputFilterGraph(durationSec) {
  const delayMs = Math.round(TTS_LEAD_IN_SEC * 1000);
  // Single delay works for mono TTS; stereo uses same offset per channel.
  return `[1:a]adelay=${delayMs},apad=whole_dur=${durationSec}[aout]`;
}

function visualFilter(outputSettings, canvasSettings, mediaFrameSettings, assPath) {
  const base = visualBaseFilter(outputSettings, canvasSettings, mediaFrameSettings);
  if (assPath) {
    return `${base},${subtitlesFilter(assPath)}`;
  }
  return base;
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
    totalDurationSec: planTotalDurationSec,
  } = input;
  const plannedDurationSec = sceneDuration(scene);
  const segmentPath = path.join(workDir, `scene-${scene.sceneId}.mp4`);
  const assPath = path.join(workDir, `scene-${scene.sceneId}.ass`);
  const voiceKey = typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : "";
  const voicePath = path.join(
    workDir,
    `voice-${scene.sceneId}${path.extname(voiceKey) || ".mp3"}`,
  );
  const hasVoice = Boolean(voiceKey);
  let durationSec = plannedDurationSec;
  if (hasVoice) {
    await storageRepo.downloadObject(voiceKey, voicePath);
    const probed = await mediaToolsRepo.getMediaDurationSec(voicePath);
    if (typeof probed === "number" && probed > 0) {
      durationSec = seconds(Math.max(plannedDurationSec, probed + VOICE_TAIL_PAD_SEC));
    }
    durationSec = seconds(durationSec + TTS_LEAD_IN_SEC);
  }
  const hasAss = await writeSceneAss(
    scene,
    subtitleSettings,
    outputSettings,
    assPath,
    overlays,
    durationSec,
    hasVoice ? TTS_LEAD_IN_SEC : 0,
  );
  const vf = visualFilter(
    outputSettings,
    canvasSettings,
    mediaFrameSettings,
    hasAss ? assPath : "",
  );
  const totalDurationSec = Number(planTotalDurationSec ?? durationSec);
  const preparedOverlays = await prepareSceneImageOverlays({
    scene,
    overlays,
    durationSec,
    totalDurationSec,
    workDir,
    sceneKey: sceneImageOverlaySceneKey(scene),
    outputSettings,
    storageRepo,
  });
  const useImageOverlays = preparedOverlays.length > 0;
  const overlayExtraInputs = useImageOverlays
    ? preparedOverlays.flatMap((o) => ["-loop", "1", "-i", o.localPath])
    : [];
  const overlayFilterComplex = useImageOverlays
    ? buildImageOverlayFilterComplex({
        baseVf: visualBaseFilter(
          outputSettings,
          canvasSettings,
          mediaFrameSettings,
        ),
        preparedOverlays,
        hasAss: Boolean(hasAss),
        assPath: hasAss ? assPath : "",
        hasVoice,
        voiceGraph: hasVoice ? voiceInputFilterGraph(durationSec) : "",
      }).filterComplex
    : "";
  const commonVideoEncodeTail = [
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
  ];
  const encodeFromImage = async (imagePath) => {
    if (useImageOverlays) {
      await mediaToolsRepo.runCommand("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        ...(hasVoice
          ? ["-i", voicePath]
          : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
        ...overlayExtraInputs,
        "-filter_complex",
        overlayFilterComplex,
        "-map",
        "[vout]",
        "-map",
        hasVoice ? "[aout]" : "1:a:0",
        ...commonVideoEncodeTail,
      ]);
      return;
    }
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
        ? ["-filter_complex", voiceInputFilterGraph(durationSec)]
        : []),
      "-vf",
      vf,
      "-map",
      "0:v:0",
      "-map",
      hasVoice ? "[aout]" : "1:a:0",
      ...commonVideoEncodeTail,
    ]);
  };

  try {
    if (typeof scene.videoClipS3Key === "string" && scene.videoClipS3Key) {
      const videoPath = path.join(
        workDir,
        `visual-${scene.sceneId}${path.extname(scene.videoClipS3Key) || ".mp4"}`,
      );
      await storageRepo.downloadObject(scene.videoClipS3Key, videoPath);
      try {
        if (useImageOverlays) {
          await mediaToolsRepo.runCommand("ffmpeg", [
            "-y",
            "-fflags",
            "+genpts",
            "-stream_loop",
            "-1",
            "-i",
            videoPath,
            ...(hasVoice
              ? ["-i", voicePath]
              : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
            ...overlayExtraInputs,
            "-filter_complex",
            overlayFilterComplex,
            "-map",
            "[vout]",
            "-map",
            hasVoice ? "[aout]" : "1:a:0",
            ...commonVideoEncodeTail,
          ]);
        } else {
          await mediaToolsRepo.runCommand("ffmpeg", [
            "-y",
            "-fflags",
            "+genpts",
            "-stream_loop",
            "-1",
            "-i",
            videoPath,
            ...(hasVoice
              ? ["-i", voicePath]
              : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
            ...(hasVoice
              ? ["-filter_complex", voiceInputFilterGraph(durationSec)]
              : []),
            "-vf",
            vf,
            "-map",
            "0:v:0",
            "-map",
            hasVoice ? "[aout]" : "1:a:0",
            ...commonVideoEncodeTail,
          ]);
        }
        return { segmentPath, durationSec };
      } catch (videoError) {
        await storageRepo.putJson(
          `logs/${jobId}/composition/fargate-segment-${scene.sceneId}-video.json`,
          {
            sceneId: scene.sceneId,
            fallback: "after-video-failure",
            reason:
              videoError instanceof Error
                ? videoError.message
                : String(videoError),
          },
        );
        if (typeof scene.imageS3Key === "string" && scene.imageS3Key) {
          const imagePath = path.join(
            workDir,
            `visual-${scene.sceneId}${path.extname(scene.imageS3Key) || ".png"}`,
          );
          await storageRepo.downloadObject(scene.imageS3Key, imagePath);
          await encodeFromImage(imagePath);
          return { segmentPath, durationSec };
        }
        throw videoError;
      }
    }
    if (typeof scene.imageS3Key === "string" && scene.imageS3Key) {
      const imagePath = path.join(
        workDir,
        `visual-${scene.sceneId}${path.extname(scene.imageS3Key) || ".png"}`,
      );
      await storageRepo.downloadObject(scene.imageS3Key, imagePath);
      await encodeFromImage(imagePath);
      return { segmentPath, durationSec };
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
    ...(hasVoice ? ["-filter_complex", voiceInputFilterGraph(durationSec)] : []),
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
  return { segmentPath, durationSec };
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
  const scenes = renderPlan.scenes ?? [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const { segmentPath, durationSec } = await createSceneSegment({
      jobId,
      scene,
      workDir,
      outputSettings,
      subtitleSettings,
      canvasSettings,
      mediaFrameSettings,
      overlays: renderPlan.overlays,
      totalDurationSec: renderPlan.totalDurationSec,
      storageRepo,
      mediaToolsRepo,
    });
    const probedSeg = await mediaToolsRepo.getMediaDurationSec(segmentPath);
    const segmentDurationSec =
      typeof probedSeg === "number" && probedSeg > 0
        ? seconds(probedSeg)
        : durationSec;
    segmentInputs.push({
      scene,
      segmentPath,
      durationSec: segmentDurationSec,
    });
    const gapAfterSec = Number(scene.gapAfterSec ?? 0);
    const hasNext = index < scenes.length - 1;
    if (hasNext && gapAfterSec > 0.001) {
      const gapPath = await createGapSegment({
        jobId,
        index: `after-${scene.sceneId}`,
        durationSec: gapAfterSec,
        workDir,
        outputSettings,
        canvasSettings,
        previousSegmentPath: segmentPath,
        storageRepo,
        mediaToolsRepo,
      });
      const probedGap = await mediaToolsRepo.getMediaDurationSec(gapPath);
      const gapDurationSec =
        typeof probedGap === "number" && probedGap > 0
          ? seconds(probedGap)
          : seconds(gapAfterSec);
      segmentInputs.push({
        scene: {
          sceneId: `gap-after-${scene.sceneId}`,
          startTransition: { type: "cut" },
        },
        segmentPath: gapPath,
        durationSec: gapDurationSec,
      });
    }
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
  const stitchedDurationSec = segmentInputs.reduce(
    (sum, entry) => sum + Number(entry.durationSec ?? 0),
    0,
  );
  await mixSoundtrack(
    concatenatedPath,
    soundtrackPath,
    Math.max(0.1, stitchedDurationSec),
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
