import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);
const region = process.env.AWS_REGION ?? "ap-northeast-2";
const bucketName = requireEnv("ASSETS_BUCKET_NAME");
const resultS3Key = requireEnv("RESULT_S3_KEY");
const jobId = requireEnv("JOB_ID");
const taskMode = process.env.TASK_MODE?.trim() || "RENDER";
const s3 = new S3Client({ region });

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function streamToBuffer(body) {
  if (!body) {
    throw new Error("S3 object body is empty");
  }
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function getJsonFromS3(key) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  const payload = await streamToBuffer(response.Body);
  return JSON.parse(payload.toString("utf8"));
}

async function putJsonToS3(key, payload) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json",
    }),
  );
}

async function downloadS3Object(key, targetPath) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  const buffer = await streamToBuffer(response.Body);
  await fs.writeFile(targetPath, buffer);
}

async function uploadFile(key, filePath, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: await fs.readFile(filePath),
      ContentType: contentType,
    }),
  );
}

async function getMediaDurationSec(filePath) {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      {
        maxBuffer: 1024 * 1024 * 5,
      },
    );
    const durationSec = Number(String(stdout).trim());
    return Number.isFinite(durationSec) && durationSec > 0
      ? durationSec
      : undefined;
  } catch {
    return undefined;
  }
}

async function runCommand(command, args) {
  try {
    await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    const stderr = error?.stderr ?? error?.message ?? String(error);
    throw new Error(`${command} failed: ${stderr}`);
  }
}

function seconds(value) {
  return Number(Math.max(0.1, value).toFixed(3));
}

function resolveOutput(renderPlan) {
  return {
    width: Number(renderPlan.output?.size?.width ?? 1080),
    height: Number(renderPlan.output?.size?.height ?? 1920),
    fps: Number(renderPlan.output?.fps ?? 30),
  };
}

function resolveCanvasSettings(renderPlan) {
  return {
    backgroundColor: normalizeHexColor(
      renderPlan.canvas?.backgroundColor ?? "#000000",
    ),
    videoScale: clampNumber(renderPlan.canvas?.videoScale, 0.5, 1.25, 1),
    videoCropMode: resolveVideoCropMode(renderPlan.canvas?.videoCropMode),
  };
}

function resolveMediaFrameSettings(renderPlan) {
  const width = clampNumber(renderPlan.mediaFrame?.width, 0.1, 1, 1);
  const height = clampNumber(renderPlan.mediaFrame?.height, 0.1, 1, 1);
  return {
    x: clampNumber(renderPlan.mediaFrame?.x, 0, 1 - width, 0),
    y: clampNumber(renderPlan.mediaFrame?.y, 0, 1 - height, 0),
    width,
    height,
  };
}

function resolveSubtitleSettings(renderPlan) {
  const style = renderPlan.subtitles?.style ?? {};
  return {
    burnIn:
      renderPlan.subtitles?.burnIn ??
      renderPlan.burnInSubtitles ??
      true,
    style: {
      fontFamily: style.fontFamily ?? "Clear Sans",
      fontSize: Number(style.fontSize ?? 32),
      fontWeight: style.fontWeight === "bold" ? "bold" : "regular",
      lineHeight: Number(style.lineHeight ?? 1),
      opacity: Number(style.opacity ?? 1),
      color: style.color ?? "#000000",
      strokeColor: style.strokeColor ?? "#ffffff",
      strokeWidth: Number(style.strokeWidth ?? 2),
      position: style.position ?? "center",
      offsetX: Number(style.offset?.x ?? -0.019),
      offsetY: Number(style.offset?.y ?? 0),
    },
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizeHexColor(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(raw)) {
    return "#000000";
  }
  return `#${raw.toUpperCase()}`;
}

function toFfmpegColor(value) {
  return `0x${normalizeHexColor(value).slice(1)}`;
}

function resolveVideoCropMode(value) {
  return value === "contain" ? "contain" : "cover";
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
      const bold = overlay.style?.fontWeight === "bold" ? 1 : 0;
      return `Dialogue: ${Number(overlay.zIndex ?? 5)},${formatAssTime(startSec)},${formatAssTime(endSec)},Default,,0,0,0,,{\\an${position.alignment}\\pos(${position.x},${position.y})\\fn${String(overlay.style?.fontFamily ?? "Clear Sans").replace(/,/g, " ")}\\fs${Math.round(Number(overlay.style?.fontSize ?? 32))}\\b${bold}\\c${assColor(overlay.style?.color ?? "#FFFFFF", Number(overlay.style?.opacity ?? 1))}\\3c${assColor(overlay.style?.strokeColor ?? "#000000", 1)}\\bord${Math.max(0, Number(overlay.style?.strokeWidth ?? 0))}}${escapeAssText(overlay.text)}`;
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
  const content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${outputSettings.width}
PlayResY: ${outputSettings.height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,${subtitleSettings.style.fontFamily},${subtitleSettings.style.fontSize},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.strokeColor, 1)},&H00000000&,${assBold},0,0,0,100,100,0,0,1,${subtitleSettings.style.strokeWidth},0,${alignment},40,40,48,1

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
  const videoScale = clampNumber(canvasSettings.videoScale, 0.5, 1.25, 1);
  const cropMode = resolveVideoCropMode(canvasSettings.videoCropMode);
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
    Math.round(
      frameWidth *
        (cropMode === "contain" ? containScale : videoScale),
    ),
  );
  const scaledHeight = Math.max(
    2,
    Math.round(
      frameHeight *
        (cropMode === "contain" ? containScale : videoScale),
    ),
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

async function createSceneSegment(
  scene,
  workDir,
  outputSettings,
  subtitleSettings,
  canvasSettings,
  mediaFrameSettings,
  overlays = [],
) {
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
    await downloadS3Object(voiceKey, voicePath);
  }
  try {
    if (typeof scene.videoClipS3Key === "string" && scene.videoClipS3Key) {
      const videoPath = path.join(
        workDir,
        `visual-${scene.sceneId}${path.extname(scene.videoClipS3Key) || ".mp4"}`,
      );
      await downloadS3Object(scene.videoClipS3Key, videoPath);
      await runCommand("ffmpeg", [
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
      await downloadS3Object(scene.imageS3Key, imagePath);
      await runCommand("ffmpeg", [
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
    await putJsonToS3(`logs/${jobId}/composition/fargate-segment-${scene.sceneId}.json`, {
      sceneId: scene.sceneId,
      fallback: true,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  await runCommand("ffmpeg", [
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

async function createGapSegment(
  index,
  durationSec,
  workDir,
  outputSettings,
  canvasSettings,
  previousSegmentPath,
) {
  const gapPath = path.join(workDir, `gap-${index}.mp4`);
  if (previousSegmentPath) {
    const freezeFramePath = path.join(workDir, `gap-${index}-freeze.png`);
    try {
      await runCommand("ffmpeg", [
        "-y",
        "-sseof",
        "-0.04",
        "-i",
        previousSegmentPath,
        "-frames:v",
        "1",
        freezeFramePath,
      ]);
      await runCommand("ffmpeg", [
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
      await putJsonToS3(`logs/${jobId}/composition/fargate-gap-${index}.json`, {
        sceneId: index,
        fallback: "solid-color",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await runCommand("ffmpeg", [
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

async function concatSegments(segmentPaths, workDir, outputPath) {
  const listPath = path.join(workDir, "segments.txt");
  await fs.writeFile(
    listPath,
    segmentPaths.map((segmentPath) => `file '${segmentPath.replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8",
  );
  await runCommand("ffmpeg", [
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

async function maybeDownloadSoundtrack(renderPlan, workDir) {
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
  await downloadS3Object(renderPlan.soundtrackSrc, soundtrackPath);
  return soundtrackPath;
}

async function mixSoundtrack(baseVideoPath, soundtrackPath, totalDurationSec, outputPath) {
  if (!soundtrackPath) {
    await fs.copyFile(baseVideoPath, outputPath);
    return;
  }
  const fadeDuration = Math.min(2, Math.max(0.2, totalDurationSec));
  const fadeStart = Math.max(totalDurationSec - fadeDuration, 0);
  await runCommand("ffmpeg", [
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

async function createPreview(finalVideoPath, renderPlan, previewPath) {
  const maxDurationSec = Number(renderPlan.preview?.maxDurationSec ?? 12);
  await runCommand("ffmpeg", [
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

async function createThumbnail(finalVideoPath, renderPlan, thumbnailPath) {
  const midpoint = Math.max(0.1, Number(renderPlan.totalDurationSec ?? 1) / 2);
  await runCommand("ffmpeg", [
    "-y",
    "-ss",
    String(midpoint),
    "-i",
    finalVideoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    thumbnailPath,
  ]);
}

function buildAtempoFilter(tempo) {
  const safeTempo = Math.max(0.5, tempo);
  const filters = [];
  let remaining = safeTempo;
  while (remaining > 2) {
    filters.push("atempo=2.0");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(",");
}

async function postProcessVoice() {
  const inputAudioS3Key = requireEnv("INPUT_AUDIO_S3_KEY");
  const outputAudioS3Key = requireEnv("OUTPUT_AUDIO_S3_KEY");
  const targetDurationSec = Number(requireEnv("TARGET_DURATION_SEC"));
  const inputDurationSec = Number(process.env.INPUT_DURATION_SEC ?? "0");
  const workDir = await fs.mkdtemp(path.join(tmpdir(), `voice-${jobId}-`));
  const inputPath = path.join(
    workDir,
    `input${path.extname(inputAudioS3Key) || ".mp3"}`,
  );
  const outputPath = path.join(workDir, "output.mp3");
  await downloadS3Object(inputAudioS3Key, inputPath);

  const safeInputDurationSec =
    Number.isFinite(inputDurationSec) && inputDurationSec > 0
      ? inputDurationSec
      : (await getMediaDurationSec(inputPath)) ?? targetDurationSec;
  const target = Math.max(0.1, targetDurationSec);
  const tempo = Math.max(1, safeInputDurationSec / target);
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-filter:a",
    buildAtempoFilter(tempo),
    "-vn",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    outputPath,
  ]);
  const resolvedDurationSec = (await getMediaDurationSec(outputPath)) ?? target;
  await uploadFile(outputAudioS3Key, outputPath, "audio/mpeg");
  await putJsonToS3(resultS3Key, {
    voiceS3Key: outputAudioS3Key,
    durationSec: resolvedDurationSec,
    provider: "fargate-ffmpeg-atempo",
    adjustedAt: new Date().toISOString(),
    tempoApplied: tempo,
  });
}

async function main() {
  if (taskMode === "VOICE_POSTPROCESS") {
    await postProcessVoice();
    return;
  }
  const renderPlanS3Key = requireEnv("RENDER_PLAN_S3_KEY");
  const renderPlan = await getJsonFromS3(renderPlanS3Key);
  const outputSettings = resolveOutput(renderPlan);
  const canvasSettings = resolveCanvasSettings(renderPlan);
  const mediaFrameSettings = resolveMediaFrameSettings(renderPlan);
  const subtitleSettings = resolveSubtitleSettings(renderPlan);
  const workDir = await fs.mkdtemp(path.join(tmpdir(), `render-${jobId}-`));
  const segmentPaths = [];
  for (const scene of renderPlan.scenes ?? []) {
    const segmentPath = await createSceneSegment(
      scene,
      workDir,
      outputSettings,
      subtitleSettings,
      canvasSettings,
      mediaFrameSettings,
      renderPlan.overlays,
    );
    segmentPaths.push(segmentPath);
    if (Number(scene.gapAfterSec) > 0) {
      segmentPaths.push(
        await createGapSegment(
          scene.sceneId,
          Number(scene.gapAfterSec),
          workDir,
          outputSettings,
          canvasSettings,
          segmentPath,
        ),
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
  await concatSegments(segmentPaths, workDir, concatenatedPath);
  const soundtrackPath = await maybeDownloadSoundtrack(renderPlan, workDir);
  await mixSoundtrack(
    concatenatedPath,
    soundtrackPath,
    Number(renderPlan.totalDurationSec ?? 1),
    finalVideoPath,
  );
  await createPreview(finalVideoPath, renderPlan, previewPath);
  await createThumbnail(finalVideoPath, renderPlan, thumbnailPath);
  const result = {
    finalVideoS3Key: `rendered/${jobId}/final.mp4`,
    previewS3Key: `previews/${jobId}/preview.mp4`,
    thumbnailS3Key: `rendered/${jobId}/thumbnail.jpg`,
    provider: "fargate-ffmpeg",
    artifactsStored: true,
    renderedAt: new Date().toISOString(),
  };
  await uploadFile(result.finalVideoS3Key, finalVideoPath, "video/mp4");
  await uploadFile(result.previewS3Key, previewPath, "video/mp4");
  await uploadFile(result.thumbnailS3Key, thumbnailPath, "image/jpeg");
  await putJsonToS3(resultS3Key, result);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await putJsonToS3(resultS3Key, {
    provider: "fargate-ffmpeg",
    failed: true,
    message,
    renderedAt: new Date().toISOString(),
  });
  process.exitCode = 1;
});
