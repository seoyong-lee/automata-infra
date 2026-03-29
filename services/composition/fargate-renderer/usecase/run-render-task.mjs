import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  resolveCanvasSettings,
  resolveMediaFrameSettings,
  resolveOutput,
  resolveSubtitleSettings,
  seconds,
  toFfmpegColor,
} from "../normalize/render-plan.mjs";
import { createRenderTaskResult } from "../mapper/render-result.mjs";

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function sceneDuration(scene) {
  const explicit = Number(scene.durationSec);
  if (Number.isFinite(explicit) && explicit > 0) {
    return seconds(explicit);
  }
  return seconds(Number(scene.endSec ?? 0) - Number(scene.startSec ?? 0));
}

function formatAssTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secondsPart = (safe % 60).toFixed(2).padStart(5, "0");
  return `${hours}:${String(minutes).padStart(2, "0")}:${secondsPart}`;
}

function assColor(hex, opacity = 1) {
  const clean = String(hex).replace("#", "").padStart(6, "0").slice(-6);
  const rr = clean.slice(0, 2);
  const gg = clean.slice(2, 4);
  const bb = clean.slice(4, 6);
  const alpha = Math.round((1 - Math.max(0, Math.min(1, opacity))) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `&H${alpha}${bb}${gg}${rr}&`;
}

function escapeAssText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}

function resolveSubtitleAlignment(position) {
  if (position === "top") {
    return 8;
  }
  if (position === "bottom") {
    return 2;
  }
  return 5;
}

function resolveSubtitleBaseYRatio(position) {
  if (position === "top") {
    return 0.14;
  }
  if (position === "bottom") {
    return 0.86;
  }
  return 0.5;
}

function resolveTextOverlayAlignment(align) {
  if (align === "left") {
    return 7;
  }
  if (align === "right") {
    return 9;
  }
  return 8;
}

function resolveTextOverlayPosition(overlay, outputSettings) {
  const align = overlay.style?.align ?? "center";
  const xRatio =
    align === "left"
      ? Number(overlay.placement?.x ?? 0)
      : align === "right"
        ? Number(overlay.placement?.x ?? 0) +
          Number(overlay.placement?.width ?? 0)
        : Number(overlay.placement?.x ?? 0) +
          Number(overlay.placement?.width ?? 0) / 2;
  return {
    x: Math.round(outputSettings.width * xRatio),
    y: Math.round(outputSettings.height * Number(overlay.placement?.y ?? 0)),
    alignment: resolveTextOverlayAlignment(align),
  };
}

function resolveHorizontalMargins(outputWidth, widthRatio) {
  const safeWidthRatio = clampNumber(widthRatio, 0.2, 1, 0.88);
  const margin = Math.round((outputWidth * (1 - safeWidthRatio)) / 2);
  return {
    left: Math.max(0, margin),
    right: Math.max(0, margin),
  };
}

function resolveOverlayMargins(overlay, outputSettings) {
  return {
    left: Math.max(
      0,
      Math.round(outputSettings.width * Number(overlay.placement?.x ?? 0)),
    ),
    right: Math.max(
      0,
      Math.round(
        outputSettings.width *
          Math.max(
            0,
            1 -
              Number(overlay.placement?.x ?? 0) -
              Number(overlay.placement?.width ?? 0),
          ),
      ),
    ),
  };
}

function getSceneTextOverlayEvents(scene, overlays, outputSettings) {
  const sceneStartSec = Number(scene.startSec ?? 0);
  const sceneEndSec = Number(scene.endSec ?? sceneDuration(scene));
  return (Array.isArray(overlays) ? overlays : [])
    .filter((overlay) => overlay?.type === "text")
    .filter((overlay) => String(overlay.text ?? "").trim().length > 0)
    .map((overlay) => {
      const overlayStartSec = Math.max(0, Number(overlay.startSec ?? sceneStartSec));
      const overlayEndSec = Math.max(
        overlayStartSec,
        Number(overlay.endSec ?? sceneEndSec),
      );
      const activeStartSec = Math.max(sceneStartSec, overlayStartSec);
      const activeEndSec = Math.min(sceneEndSec, overlayEndSec);
      return {
        overlay,
        startSec: activeStartSec - sceneStartSec,
        endSec: activeEndSec - sceneStartSec,
      };
    })
    .filter((event) => event.endSec > event.startSec)
    .map(({ overlay, startSec, endSec }) => {
      const position = resolveTextOverlayPosition(overlay, outputSettings);
      const margins = resolveOverlayMargins(overlay, outputSettings);
      const bold = overlay.style?.fontWeight === "bold" ? 1 : 0;
      return `Dialogue: ${Number(overlay.zIndex ?? 5)},${formatAssTime(startSec)},${formatAssTime(endSec)},Default,,${margins.left},${margins.right},0,,{\\an${position.alignment}\\pos(${position.x},${position.y})\\fn${String(overlay.style?.fontFamily ?? "Clear Sans").replace(/,/g, " ")}\\fs${Math.round(Number(overlay.style?.fontSize ?? 32))}\\b${bold}\\c${assColor(overlay.style?.color ?? "#FFFFFF", Number(overlay.style?.opacity ?? 1))}\\3c${assColor(overlay.style?.strokeColor ?? "#000000", 1)}\\bord${Math.max(0, Number(overlay.style?.strokeWidth ?? 0))}}${escapeAssText(overlay.text)}`;
    });
}

function normalizeSceneSubtitleSegments(scene) {
  const segments = Array.isArray(scene.subtitleSegments)
    ? scene.subtitleSegments
        .map((segment) => ({
          text: String(segment?.text ?? "").trim(),
          startSec: Number(segment?.startSec ?? 0),
          endSec: Number(segment?.endSec ?? 0),
        }))
        .filter(
          (segment) =>
            segment.text &&
            Number.isFinite(segment.startSec) &&
            Number.isFinite(segment.endSec) &&
            segment.endSec > segment.startSec,
        )
    : [];
  if (segments.length > 0) {
    return segments;
  }
  const text = String(scene.subtitle ?? "").trim();
  if (!text) {
    return [];
  }
  return [
    {
      text,
      startSec: Number(scene.startSec ?? 0),
      endSec: Number(scene.endSec ?? sceneDuration(scene)),
    },
  ];
}

async function writeSceneAss(
  scene,
  subtitleSettings,
  outputSettings,
  assPath,
  overlays = [],
) {
  const subtitleSegments = normalizeSceneSubtitleSegments(scene);
  const overlayEvents = getSceneTextOverlayEvents(scene, overlays, outputSettings);
  const alignment = resolveSubtitleAlignment(subtitleSettings.style.position);
  const posX = Math.round(
    outputSettings.width * (0.5 + subtitleSettings.style.offsetX),
  );
  const posY = Math.round(
    outputSettings.height *
      (resolveSubtitleBaseYRatio(subtitleSettings.style.position) +
        subtitleSettings.style.offsetY),
  );
  const subtitleEvents =
    !subtitleSettings.burnIn || subtitleSegments.length === 0
      ? []
      : subtitleSegments.map((segment) => {
          const segmentStartSec = Math.max(
            0,
            segment.startSec - Number(scene.startSec ?? 0),
          );
          const segmentEndSec = Math.max(
            segmentStartSec + 0.05,
            segment.endSec - Number(scene.startSec ?? 0),
          );
          return `Dialogue: 0,${formatAssTime(segmentStartSec)},${formatAssTime(segmentEndSec)},Default,,0,0,0,,{\\pos(${posX},${posY})}${escapeAssText(segment.text)}`;
        });
  if (subtitleEvents.length === 0 && overlayEvents.length === 0) {
    return false;
  }
  const assBold = subtitleSettings.style.fontWeight === "bold" ? -1 : 0;
  const subtitleMargins = resolveHorizontalMargins(
    outputSettings.width,
    subtitleSettings.style.maxWidth,
  );
  const content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${outputSettings.width}
PlayResY: ${outputSettings.height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,${subtitleSettings.style.fontFamily},${subtitleSettings.style.fontSize},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.strokeColor, 1)},&H00000000&,${assBold},0,0,0,100,100,0,0,1,${subtitleSettings.style.strokeWidth},0,${alignment},${subtitleMargins.left},${subtitleMargins.right},48,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${[...subtitleEvents, ...overlayEvents].join("\n")}
`;
  await fs.writeFile(assPath, content, "utf8");
  return true;
}

function subtitlesFilter(assPath) {
  const escaped = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
  return `subtitles='${escaped}'`;
}

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

async function concatSegments(segmentPaths, workDir, outputPath, mediaToolsRepo) {
  const listPath = path.join(workDir, "segments.txt");
  await fs.writeFile(
    listPath,
    segmentPaths
      .map((segmentPath) => `file '${segmentPath.replace(/'/g, "'\\''")}'`)
      .join("\n"),
    "utf8",
  );
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

async function maybeDownloadSoundtrack(renderPlan, workDir, storageRepo) {
  if (typeof renderPlan.soundtrackSrc !== "string" || !renderPlan.soundtrackSrc) {
    return undefined;
  }
  if (/^https?:\/\//.test(renderPlan.soundtrackSrc)) {
    const response = await fetch(renderPlan.soundtrackSrc);
    if (!response.ok) {
      throw new Error(`Failed to download soundtrack: ${response.status}`);
    }
    const soundtrackPath = path.join(
      workDir,
      `soundtrack${path.extname(new URL(renderPlan.soundtrackSrc).pathname) || ".bin"}`,
    );
    await fs.writeFile(soundtrackPath, Buffer.from(await response.arrayBuffer()));
    return soundtrackPath;
  }
  const soundtrackPath = path.join(
    workDir,
    `soundtrack${path.extname(renderPlan.soundtrackSrc) || ".bin"}`,
  );
  await storageRepo.downloadObject(renderPlan.soundtrackSrc, soundtrackPath);
  return soundtrackPath;
}

async function mixSoundtrack(
  baseVideoPath,
  soundtrackPath,
  totalDurationSec,
  outputPath,
  mediaToolsRepo,
) {
  if (!soundtrackPath) {
    await fs.copyFile(baseVideoPath, outputPath);
    return;
  }
  const fadeDuration = Math.min(2, Math.max(0.2, totalDurationSec));
  const fadeStart = Math.max(totalDurationSec - fadeDuration, 0);
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-i",
    baseVideoPath,
    "-stream_loop",
    "-1",
    "-i",
    soundtrackPath,
    "-filter_complex",
    `[1:a]volume=0.18,atrim=0:${totalDurationSec},afade=t=out:st=${fadeStart}:d=${fadeDuration}[bgm];[0:a][bgm]amix=inputs=2:normalize=0:duration=first[aout]`,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function createPreview(finalVideoPath, renderPlan, previewPath, mediaToolsRepo) {
  const maxDurationSec = Number(renderPlan.preview?.maxDurationSec ?? 12);
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-i",
    finalVideoPath,
    "-t",
    String(seconds(maxDurationSec)),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    previewPath,
  ]);
}

async function createThumbnail(finalVideoPath, renderPlan, thumbnailPath, mediaToolsRepo) {
  const totalDurationSec = Math.max(0.1, Number(renderPlan.totalDurationSec ?? 1));
  const thumbnailSec = Math.max(0.1, Math.min(3, totalDurationSec - 0.1));
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-ss",
    String(thumbnailSec),
    "-i",
    finalVideoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    thumbnailPath,
  ]);
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
  const segmentPaths = [];

  for (const scene of renderPlan.scenes ?? []) {
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
    segmentPaths.push(segmentPath);
    if (Number(scene.gapAfterSec) > 0) {
      segmentPaths.push(
        await createGapSegment({
          jobId,
          index: scene.sceneId,
          durationSec: Number(scene.gapAfterSec),
          workDir,
          outputSettings,
          canvasSettings,
          previousSegmentPath: segmentPath,
          storageRepo,
          mediaToolsRepo,
        }),
      );
    }
  }

  if (!segmentPaths.length) {
    throw new Error("Render plan has no scenes to compose");
  }

  const concatenatedPath = path.join(workDir, "combined.mp4");
  const finalVideoPath = path.join(workDir, "final.mp4");
  const previewPath = path.join(workDir, "preview.mp4");
  const thumbnailPath = path.join(workDir, "thumbnail.jpg");

  await concatSegments(segmentPaths, workDir, concatenatedPath, mediaToolsRepo);
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
