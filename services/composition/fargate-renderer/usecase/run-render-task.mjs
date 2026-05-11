import { randomBytes } from "node:crypto";
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

/**
 * If `gapAfterSec` is inflated vs the global timeline (`next.startSec - scene.endSec`), trust the timeline.
 * Prevents one-off corrupt plan fields from producing long freeze gaps beyond the planned timeline.
 */
function resolveGapAfterSecFromPlan(scene, nextScene) {
  const fieldGap = Number(scene?.gapAfterSec ?? 0);
  if (!nextScene) {
    return Math.max(0, fieldGap);
  }
  const timelineGap = Math.max(
    0,
    Number(nextScene.startSec ?? 0) - Number(scene.endSec ?? 0),
  );
  let effective = fieldGap;
  if (Number.isFinite(timelineGap) && fieldGap > timelineGap + 0.05) {
    effective = timelineGap;
  }
  return Math.max(0, effective);
}

/**
 * 마지막 정지 화면용 PNG. `-sseof` 직후 한 장만 디코드하면 H.264 GOP 때문에
 * 세그먼트 **시작** 근처 키프레임이 잡혀 Ken Burns 등이 "처음으로 돌아간" 것처럼 보일 수 있다.
 * CFR 가정으로 `duration * fps`에서 마지막 프레임 인덱스를 잡고 `select=eq(n,…)`로 뽑는다.
 */
async function extractClosingFreezePng(input) {
  const {
    previousSegmentPath,
    freezeFramePath,
    segmentDurationSec,
    fps,
    mediaToolsRepo,
  } = input;
  const d = Number(segmentDurationSec);
  const f = Number(fps);
  if (Number.isFinite(d) && d > 0 && Number.isFinite(f) && f > 0) {
    const approxCount = Math.max(1, Math.round(d * f));
    const maxIndex = approxCount - 1;
    for (let delta = 0; delta <= 20; delta += 1) {
      const n = Math.max(0, maxIndex - delta);
      try {
        await fs.rm(freezeFramePath, { force: true });
        await mediaToolsRepo.runCommand("ffmpeg", [
          "-y",
          "-i",
          previousSegmentPath,
          "-vf",
          `select=eq(n\\,${n})`,
          "-vsync",
          "0",
          "-frames:v",
          "1",
          freezeFramePath,
        ]);
        const stat = await fs.stat(freezeFramePath);
        if (stat.size > 64) {
          return { ok: true, method: "select-last-frame", frameIndex: n };
        }
      } catch {
        // try next n
      }
    }
  }
  try {
    await fs.rm(freezeFramePath, { force: true });
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
    const stat = await fs.stat(freezeFramePath);
    if (stat.size > 64) {
      return { ok: true, method: "sseof-fallback" };
    }
  } catch {
    // fall through
  }
  return { ok: false, method: "none" };
}

/** Align encode / concat metadata to whole output frames (same grid as render plan). */
function snapDurationToOutputFps(sec, fps) {
  const f = Number(fps);
  const raw = Number(sec);
  if (!Number.isFinite(raw) || raw <= 0) {
    return seconds(0.1);
  }
  if (!Number.isFinite(f) || f <= 0) {
    return seconds(raw);
  }
  const frames = Math.max(1, Math.round(raw * f));
  return frames / f;
}

function isDebugMp4BundleEnabled() {
  const v = process.env.FARGATE_DEBUG_MP4_BUNDLE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Uploads segment MP4s, combined, and final under `debug/{jobId}/{bundleId}/` (unique bundleId per run).
 * Enable with env `FARGATE_DEBUG_MP4_BUNDLE=1` for CDN vs pipeline triage (presigned URLs).
 */
async function uploadDebugMp4Bundle({ jobId, bundleId, storageRepo, files }) {
  const base = `debug/${jobId}/${bundleId}`;
  const keys = [];
  const errors = [];
  for (const { localPath, objectName } of files) {
    try {
      await fs.access(localPath);
      const key = `${base}/${objectName}`;
      await storageRepo.uploadFile(key, localPath, "video/mp4");
      keys.push(key);
    } catch (error) {
      errors.push({
        objectName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  try {
    await storageRepo.putJson(`${base}/manifest.json`, {
      jobId,
      bundleId,
      basePrefix: base,
      at: new Date().toISOString(),
      keys,
      errors,
    });
  } catch {
    // best-effort manifest
  }
  return base;
}

function extractFilterComplexFromFfmpegArgs(args) {
  const i = args.indexOf("-filter_complex");
  if (i >= 0 && i + 1 < args.length) {
    return String(args[i + 1]);
  }
  return null;
}

/**
 * Writes `logs/{jobId}/composition/fargate-segment-{sceneId}-ffmpeg-{label}-*.json` for black-screen triage.
 */
async function runFfmpegWithDiagnostics({
  jobId,
  sceneId,
  label,
  args,
  mediaToolsRepo,
  storageRepo,
  extra = {},
}) {
  const base = `logs/${jobId}/composition/fargate-segment-${sceneId}-ffmpeg-${label}`;
  await storageRepo.putJson(`${base}-before.json`, {
    at: new Date().toISOString(),
    filterComplex: extractFilterComplexFromFfmpegArgs(args),
    argvPreview: args.slice(0, 24),
    argvTail: args.slice(-8),
    argc: args.length,
    ...extra,
  });
  try {
    const captured = await mediaToolsRepo.runCommand("ffmpeg", args, {
      capture: true,
    });
    const outPath = args[args.length - 1];
    let probe = null;
    if (
      typeof outPath === "string" &&
      outPath.endsWith(".mp4") &&
      typeof mediaToolsRepo.ffprobeVideoSummary === "function"
    ) {
      probe = await mediaToolsRepo.ffprobeVideoSummary(outPath);
    }
    await storageRepo.putJson(`${base}-after.json`, {
      at: new Date().toISOString(),
      stderrTail: captured?.stderr?.slice(-14000) ?? "",
      probe,
    });
  } catch (error) {
    await storageRepo.putJson(`${base}-error.json`, {
      at: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

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
  durationSec = snapDurationToOutputFps(durationSec, outputSettings.fps);
  const hasAss = await writeSceneAss(
    scene,
    subtitleSettings,
    outputSettings,
    assPath,
    overlays,
    durationSec,
    hasVoice ? TTS_LEAD_IN_SEC : 0,
    { jobId, storageRepo },
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
        segmentDurationSec: durationSec,
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
      const imageProbe =
        typeof mediaToolsRepo.ffprobeVideoSummary === "function"
          ? await mediaToolsRepo.ffprobeVideoSummary(imagePath)
          : null;
      await runFfmpegWithDiagnostics({
        jobId,
        sceneId: scene.sceneId,
        label: "scene-image-overlays",
        args: [
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
        ],
        mediaToolsRepo,
        storageRepo,
        extra: {
          mode: "encodeFromImage",
          imageProbe,
          preparedOverlayCount: preparedOverlays.length,
        },
      });
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
      let videoInputProbe = null;
      if (
        useImageOverlays &&
        typeof mediaToolsRepo.ffprobeVideoSummary === "function"
      ) {
        videoInputProbe = await mediaToolsRepo.ffprobeVideoSummary(videoPath);
      }
      try {
        if (useImageOverlays) {
          await runFfmpegWithDiagnostics({
            jobId,
            sceneId: scene.sceneId,
            label: "scene-video-overlays",
            args: [
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
            ],
            mediaToolsRepo,
            storageRepo,
            extra: {
              mode: "videoClipWithImageOverlays",
              videoInputProbe,
              preparedOverlayCount: preparedOverlays.length,
              durationSec,
              hasAss: Boolean(hasAss),
            },
          });
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
        useImageOverlays,
        hasVideoClip: Boolean(scene.videoClipS3Key),
        hasImageClip: Boolean(scene.imageS3Key),
        reason: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
  }
  await storageRepo.putJson(
    `logs/${jobId}/composition/fargate-segment-${scene.sceneId}-solid-fallback.json`,
    {
      at: new Date().toISOString(),
      useImageOverlays,
      hasVideoClip: Boolean(scene.videoClipS3Key),
      hasImageClip: Boolean(scene.imageS3Key),
      note: "Encoding solid canvas + optional subtitles (previous paths did not return a segment).",
    },
  );
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
    durationSec: rawGapDurationSec,
    workDir,
    outputSettings,
    canvasSettings,
    previousSegmentPath,
    previousSegmentDurationSec,
    storageRepo,
    mediaToolsRepo,
  } = input;
  const durationSec = snapDurationToOutputFps(
    rawGapDurationSec,
    outputSettings.fps,
  );
  const gapPath = path.join(workDir, `gap-${index}.mp4`);
  if (previousSegmentPath) {
    const freezeFramePath = path.join(workDir, `gap-${index}-freeze.png`);
    try {
      const freezeInfo = await extractClosingFreezePng({
        previousSegmentPath,
        freezeFramePath,
        segmentDurationSec: previousSegmentDurationSec,
        fps: outputSettings.fps,
        mediaToolsRepo,
      });
      if (!freezeInfo.ok) {
        throw new Error("closing freeze png not produced");
      }
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
      try {
        await storageRepo.putJson(`logs/${jobId}/composition/fargate-gap-${index}.json`, {
          sceneId: index,
          fallback: "solid-color",
          previousSegmentDurationSec,
          reason: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // ignore
      }
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
    const segmentDurationSec = snapDurationToOutputFps(
      typeof probedSeg === "number" && probedSeg > 0 ? probedSeg : durationSec,
      outputSettings.fps,
    );
    segmentInputs.push({
      scene,
      segmentPath,
      durationSec: segmentDurationSec,
    });
    const nextScene = index < scenes.length - 1 ? scenes[index + 1] : undefined;
    const gapAfterSec = resolveGapAfterSecFromPlan(scene, nextScene);
    if (nextScene && gapAfterSec > 0.001) {
      const gapPath = await createGapSegment({
        jobId,
        index: `after-${scene.sceneId}`,
        durationSec: gapAfterSec,
        workDir,
        outputSettings,
        canvasSettings,
        previousSegmentPath: segmentPath,
        previousSegmentDurationSec: segmentDurationSec,
        storageRepo,
        mediaToolsRepo,
      });
      // Planned length on frame grid (matches encoded gap; avoids bogus ffprobe on freeze clips).
      const gapDurationSec = snapDurationToOutputFps(
        gapAfterSec,
        outputSettings.fps,
      );
      try {
        const timelineGapSec = Math.max(
          0,
          Number(nextScene.startSec ?? 0) - Number(scene.endSec ?? 0),
        );
        await storageRepo.putJson(
          `logs/${jobId}/composition/gap-after-${scene.sceneId}.json`,
          {
            at: new Date().toISOString(),
            sceneId: scene.sceneId,
            sceneStartSec: scene.startSec,
            sceneEndSec: scene.endSec,
            gapAfterSecFromPlan: Number(scene.gapAfterSec ?? 0),
            gapAfterSecEffective: gapAfterSec,
            timelineGapSec,
            nextSceneId: nextScene.sceneId,
            nextStartSec: nextScene.startSec,
            gapDurationSecForConcat: gapDurationSec,
            gapPath: path.basename(gapPath),
          },
        );
      } catch {
        // best-effort gap triage
      }
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

  try {
    const stitchedSumSec = segmentInputs.reduce(
      (sum, entry) => sum + Number(entry.durationSec ?? 0),
      0,
    );
    await storageRepo.putJson(
      `logs/${jobId}/composition/segment-inputs.json`,
      {
        at: new Date().toISOString(),
        stitchedSumSec,
        segmentCount: segmentInputs.length,
        segmentInputs: segmentInputs.map((s, i) => ({
          index: i,
          sceneId: s.scene?.sceneId ?? null,
          startTransition: s.scene?.startTransition ?? null,
          segmentFile: path.basename(s.segmentPath),
          segmentPath: s.segmentPath,
          durationSec: s.durationSec,
        })),
      },
    );
  } catch {
    // best-effort concat triage
  }

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

  let debugMp4BundlePrefix;
  if (isDebugMp4BundleEnabled()) {
    const bundleId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const segmentFiles = segmentInputs.map(({ segmentPath }) => ({
      localPath: segmentPath,
      objectName: path.basename(segmentPath),
    }));
    debugMp4BundlePrefix = await uploadDebugMp4Bundle({
      jobId,
      bundleId,
      storageRepo,
      files: [
        ...segmentFiles,
        { localPath: concatenatedPath, objectName: "combined.mp4" },
        { localPath: finalVideoPath, objectName: "final.mp4" },
      ],
    });
  }

  await createPreview(finalVideoPath, renderPlan, previewPath, mediaToolsRepo);
  await createThumbnail(finalVideoPath, renderPlan, thumbnailPath, mediaToolsRepo);

  const renderedAt = now();
  const renderId = renderedAt.replaceAll(":", "-").replaceAll(".", "-");
  const result = createRenderTaskResult({
    jobId,
    renderId,
    renderedAt,
    ...(debugMp4BundlePrefix ? { debugMp4BundlePrefix } : {}),
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
