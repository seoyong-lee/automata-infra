import { execFileSync } from "node:child_process";
import path from "node:path";
import { toFfmpegColor } from "../normalize/render-plan.mjs";
import { subtitlesFilter } from "./scene-ass.mjs";

export function visualBaseFilter(outputSettings, canvasSettings, mediaFrameSettings) {
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
  return filters.join(",");
}

function formatExprFloat(value) {
  return Number(value).toFixed(4);
}

/**
 * @param {string} filePath
 * @returns { { w: number, h: number } | null }
 */
function probeImageSize(filePath) {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        filePath,
      ],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    const parts = out.trim().split("x");
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      return null;
    }
    return { w, h };
  } catch {
    return null;
  }
}

function buildOverlayScaleChain(pw, ph, fit, opacity) {
  const f = fit ?? "contain";
  let chain;
  if (f === "stretch") {
    chain = `scale=${pw}:${ph}`;
  } else if (f === "cover") {
    chain = `scale=${pw}:${ph}:force_original_aspect_ratio=increase,crop=${pw}:${ph}`;
  } else {
    chain = `scale=${pw}:${ph}:force_original_aspect_ratio=decrease,pad=${pw}:${ph}:(ow-iw)/2:(oh-ih)/2:${toFfmpegColor("#000000")}`;
  }
  if (typeof opacity === "number" && opacity < 1 - 1e-6) {
    const a = Math.max(0, Math.min(1, opacity));
    chain += `,format=yuva420p,colorchannelmixer=aa=${formatExprFloat(a)}`;
  }
  return chain;
}

/**
 * @returns {Promise<Array<{
 *   localPath: string,
 *   px: number, py: number, pw: number, ph: number,
 *   fit: string, opacity?: number,
 *   localStart: number, localEnd: number,
 *   zIndex: number,
 *   scaleChain: string,
 * }>>}
 */
export async function prepareSceneImageOverlays({
  scene,
  overlays,
  durationSec,
  totalDurationSec,
  workDir,
  sceneKey,
  outputSettings,
  storageRepo,
}) {
  const clipGlobalStart = Number(scene.startSec ?? 0);
  const clipGlobalEnd = clipGlobalStart + Math.max(0.05, Number(durationSec));
  const totalEnd = Math.max(
    clipGlobalEnd,
    Number(totalDurationSec ?? clipGlobalEnd),
  );
  const wOut = outputSettings.width;
  const hOut = outputSettings.height;
  const rows = [];
  for (const overlay of overlays ?? []) {
    if (overlay?.type !== "image") {
      continue;
    }
    const src = String(overlay.src ?? "").trim();
    if (!src) {
      continue;
    }
    const overlayStart = Number(overlay.startSec ?? 0);
    const overlayEnd = Number(
      overlay.endSec !== undefined && overlay.endSec !== null
        ? overlay.endSec
        : totalEnd,
    );
    const activeStart = Math.max(clipGlobalStart, overlayStart);
    const activeEnd = Math.min(clipGlobalEnd, overlayEnd);
    if (activeEnd <= activeStart + 1e-4) {
      continue;
    }
    const localStart = activeStart - clipGlobalStart;
    const localEnd = activeEnd - clipGlobalStart;
    const ext = path.extname(src) || ".png";
    const safeId = String(overlay.overlayId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const localPath = path.join(workDir, `overlay-${sceneKey}-${safeId}${ext}`);
    await storageRepo.downloadObject(src, localPath);
    const pw = Math.max(
      2,
      Math.round(Number(overlay.placement?.width ?? 0.2) * wOut),
    );
    const normH = overlay.placement?.height;
    let ph;
    if (
      normH !== undefined &&
      normH !== null &&
      Number.isFinite(Number(normH)) &&
      Number(normH) > 0
    ) {
      ph = Math.max(2, Math.round(Number(normH) * hOut));
    } else {
      const dim = probeImageSize(localPath);
      if (dim && dim.w > 0) {
        ph = Math.max(2, Math.round((pw * dim.h) / dim.w));
      } else {
        ph = Math.max(2, Math.round(0.2 * hOut));
      }
    }
    const pwSafe = Math.min(pw, wOut);
    const phSafe = Math.min(ph, hOut);
    let px = Math.round(Number(overlay.placement?.x ?? 0) * wOut);
    let py = Math.round(Number(overlay.placement?.y ?? 0) * hOut);
    px = Math.min(Math.max(0, wOut - pwSafe), Math.max(0, px));
    py = Math.min(Math.max(0, hOut - phSafe), Math.max(0, py));
    rows.push({
      localPath,
      px,
      py,
      pw: pwSafe,
      ph: phSafe,
      fit: overlay.fit ?? "contain",
      opacity: overlay.opacity,
      localStart,
      localEnd,
      zIndex: Number(overlay.zIndex ?? 6),
      scaleChain: `${buildOverlayScaleChain(pwSafe, phSafe, overlay.fit ?? "contain", overlay.opacity)},fps=${Math.max(1, Math.round(Number(outputSettings.fps) || 30))}`,
    });
  }
  rows.sort((a, b) => a.zIndex - b.zIndex);
  return rows;
}

export function buildImageOverlayFilterComplex({
  baseVf,
  preparedOverlays,
  /** Scene segment length (sec); used to omit overlay `enable=` when the image spans the whole clip. */
  segmentDurationSec,
  hasAss,
  assPath,
  hasVoice,
  voiceGraph,
}) {
  const parts = [];
  // Avoid setpts here: with `-stream_loop -1` + subtitles + overlay, extra PTS rewiring has produced all-black video in production.
  parts.push(`[0:v]${baseVf}[vbase]`);
  const rawClipDur = Number(segmentDurationSec);
  const clipDur =
    Number.isFinite(rawClipDur) && rawClipDur > 0
      ? Math.max(0.05, rawClipDur)
      : null;
  let cur = "vbase";
  let inputIdx = 2;
  for (let i = 0; i < preparedOverlays.length; i++) {
    const o = preparedOverlays[i];
    const olab = `sol${i}`;
    const vlab = `vim${i}`;
    parts.push(`[${inputIdx}:v]${o.scaleChain}[${olab}]`);
    const ls = formatExprFloat(o.localStart);
    const le = formatExprFloat(o.localEnd);
    const spansFullClip =
      clipDur !== null &&
      o.localStart <= 0.02 &&
      o.localEnd >= clipDur - 0.02;
    const enableClause = spansFullClip
      ? ""
      : `:enable='between(t\\,${ls}\\,${le})'`;
    parts.push(
      `[${cur}][${olab}]overlay=${o.px}:${o.py}${enableClause}[${vlab}]`,
    );
    cur = vlab;
    inputIdx += 1;
  }
  if (hasAss && assPath) {
    parts.push(`[${cur}]${subtitlesFilter(assPath)}[vout]`);
  } else {
    parts.push(`[${cur}]format=yuv420p[vout]`);
  }
  if (hasVoice) {
    parts.push(voiceGraph);
  }
  return {
    filterComplex: parts.join(";"),
    overlayInputCount: preparedOverlays.length,
  };
}

export function sceneImageOverlaySceneKey(scene) {
  return `scene-${scene.sceneId}`;
}
