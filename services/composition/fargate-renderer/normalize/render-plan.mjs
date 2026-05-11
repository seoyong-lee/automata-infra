export function seconds(value) {
  return Number(Math.max(0.1, value).toFixed(3));
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

function resolveVideoCropMode(value) {
  return value === "contain" ? "contain" : "cover";
}

export function toFfmpegColor(value) {
  return `0x${normalizeHexColor(value).slice(1)}`;
}

export function resolveOutput(renderPlan) {
  return {
    width: Number(renderPlan.output?.size?.width ?? 1080),
    height: Number(renderPlan.output?.size?.height ?? 1920),
    fps: Number(renderPlan.output?.fps ?? 30),
  };
}

export function resolveCanvasSettings(renderPlan) {
  return {
    backgroundColor: normalizeHexColor(
      renderPlan.canvas?.backgroundColor ?? "#000000",
    ),
    videoScale: clampNumber(renderPlan.canvas?.videoScale, 0.5, 1.25, 1),
    videoCropMode: resolveVideoCropMode(renderPlan.canvas?.videoCropMode),
  };
}

export function resolveMediaFrameSettings(renderPlan) {
  const width = clampNumber(renderPlan.mediaFrame?.width, 0.1, 1, 1);
  const height = clampNumber(renderPlan.mediaFrame?.height, 0.1, 1, 1);
  return {
    x: clampNumber(renderPlan.mediaFrame?.x, 0, 1 - width, 0),
    y: clampNumber(renderPlan.mediaFrame?.y, 0, 1 - height, 0),
    width,
    height,
  };
}

export function resolveSubtitleSettings(renderPlan) {
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
      maxWidth: clampNumber(style.maxWidth, 0.2, 1, 0.88),
      color: style.color ?? "#000000",
      strokeColor: style.strokeColor ?? "#ffffff",
      strokeWidth: Number(style.strokeWidth ?? 2),
      shadowDepth: clampNumber(style.shadowDepth, 0, 8, 3),
      position: style.position ?? "center",
      offsetX: Number(style.offset?.x ?? -0.019),
      offsetY: Number(style.offset?.y ?? 0),
    },
  };
}
