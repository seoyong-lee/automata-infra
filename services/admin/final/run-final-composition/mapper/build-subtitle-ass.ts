import type {
  RenderPlan,
  RenderPlanOverlay,
  RenderPlanOutput,
  RenderPlanSubtitleSegment,
  RenderPlanSubtitleStyle,
} from "../../../../../types/render/render-plan";

const DEFAULT_RENDER_OUTPUT: RenderPlanOutput = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1920,
  },
  fps: 30,
};
const PREVIEW_TEXT_REFERENCE_SHORT_EDGE = 320;

const formatAssTimestamp = (seconds: number): string => {
  const safeCs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(safeCs / 360_000);
  const minutes = Math.floor((safeCs % 360_000) / 6_000);
  const secs = Math.floor((safeCs % 6_000) / 100);
  const centis = safeCs % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const stripHashPrefix = (value: string): string => {
  return value.startsWith("#") ? value.slice(1) : value;
};

const toAssColor = (value: string, opacity = 1): string => {
  const normalized = stripHashPrefix(value).padStart(6, "0").slice(0, 6);
  const red = normalized.slice(0, 2);
  const green = normalized.slice(2, 4);
  const blue = normalized.slice(4, 6);
  const alpha = Math.round((1 - clamp(opacity, 0, 1)) * 255);
  return `&H${alpha.toString(16).toUpperCase().padStart(2, "0")}${blue}${green}${red}&`;
};

const escapeAssText = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\N")
    .replace(/[{}]/g, "")
    .trim();
};

const resolveSubtitleAlignment = (
  position: RenderPlanSubtitleStyle["position"],
): number => {
  if (position === "top") {
    return 8;
  }
  if (position === "center") {
    return 5;
  }
  return 2;
};

const resolveSubtitleBasePosition = (
  style: RenderPlanSubtitleStyle,
  output: RenderPlanOutput,
) => {
  const baseYRatio =
    style.position === "top" ? 0.14 : style.position === "center" ? 0.5 : 0.86;
  const x = Math.round(output.size.width * (0.5 + style.offset.x));
  const y = Math.round(output.size.height * (baseYRatio + style.offset.y));
  return {
    x: clamp(x, 0, output.size.width),
    y: clamp(y, 0, output.size.height),
    alignment: resolveSubtitleAlignment(style.position),
  };
};

const resolveHorizontalMarginsFromWidthRatio = (
  outputWidth: number,
  widthRatio?: number,
) => {
  const safeWidthRatio = clamp(widthRatio ?? 0.88, 0.2, 1);
  const margin = Math.round((outputWidth * (1 - safeWidthRatio)) / 2);
  return {
    left: Math.max(0, margin),
    right: Math.max(0, margin),
  };
};

const resolveOverlayMargins = (
  overlay: Extract<RenderPlanOverlay, { type: "text" }>,
  output: RenderPlanOutput,
) => {
  const left = Math.round(output.size.width * overlay.placement.x);
  const right = Math.round(
    output.size.width *
      Math.max(0, 1 - overlay.placement.x - overlay.placement.width),
  );
  return {
    left: clamp(left, 0, output.size.width),
    right: clamp(right, 0, output.size.width),
  };
};

const buildAssStyleLine = (
  style: RenderPlanSubtitleStyle,
  output: RenderPlanOutput,
): string => {
  const assBold = style.fontWeight === "bold" ? -1 : 0;
  const margins = resolveHorizontalMarginsFromWidthRatio(
    output.size.width,
    style.maxWidth,
  );
  return [
    "Style: Default",
    style.fontFamily.replace(/,/g, " "),
    Math.round(style.fontSize),
    toAssColor(style.color, style.opacity),
    toAssColor(style.color, style.opacity),
    toAssColor(style.strokeColor, 1),
    "&H00000000&",
    assBold,
    0,
    0,
    0,
    100,
    100,
    0,
    0,
    1,
    Math.max(0, style.strokeWidth),
    0,
    resolveSubtitleAlignment(style.position),
    margins.left,
    margins.right,
    Math.round(output.size.height * 0.06),
    1,
  ].join(",");
};

const resolveTextOverlayAlignment = (
  align?: "left" | "center" | "right",
): number => {
  if (align === "left") {
    return 4;
  }
  if (align === "right") {
    return 6;
  }
  return 5;
};

const resolveTextOverlayPosition = (
  overlay: Extract<RenderPlanOverlay, { type: "text" }>,
  output: RenderPlanOutput,
) => {
  const align = overlay.style.align ?? "center";
  const xRatio =
    align === "left"
      ? overlay.placement.x
      : align === "right"
        ? overlay.placement.x + overlay.placement.width
        : overlay.placement.x + overlay.placement.width / 2;
  const yRatio = overlay.placement.y + overlay.placement.height / 2;
  return {
    x: clamp(Math.round(output.size.width * xRatio), 0, output.size.width),
    y: clamp(
      Math.round(output.size.height * yRatio),
      0,
      output.size.height,
    ),
    alignment: resolveTextOverlayAlignment(align),
  };
};

const resolveOverlayFontSize = (
  overlay: Extract<RenderPlanOverlay, { type: "text" }>,
  output: RenderPlanOutput,
): number => {
  const outputShortEdge = Math.min(output.size.width, output.size.height);
  return Math.round(
    Math.max(12, overlay.style.fontSize) *
      (outputShortEdge / PREVIEW_TEXT_REFERENCE_SHORT_EDGE),
  );
};

const estimateCharUnits = (char: string): number => {
  if (!char.trim()) {
    return 0.35;
  }
  if (/^[A-Za-z0-9]$/.test(char)) {
    return 0.6;
  }
  if (/^[.,!?;:'"()\-[\]]$/.test(char)) {
    return 0.45;
  }
  return 1;
};

const estimateTextUnits = (value: string): number => {
  return [...value].reduce((sum, char) => sum + estimateCharUnits(char), 0);
};

const splitLongToken = (token: string, maxUnits: number): string[] => {
  const parts: string[] = [];
  let current = "";
  let currentUnits = 0;
  for (const char of [...token]) {
    const charUnits = estimateCharUnits(char);
    if (current && currentUnits + charUnits > maxUnits) {
      parts.push(current);
      current = char;
      currentUnits = charUnits;
      continue;
    }
    current += char;
    currentUnits += charUnits;
  }
  if (current) {
    parts.push(current);
  }
  return parts;
};

const wrapTextToWidth = (text: string, maxUnits: number): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (estimateTextUnits(normalized) <= maxUnits) {
    return normalized;
  }
  const tokens = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token;
    if (!current || estimateTextUnits(candidate) <= maxUnits) {
      current = candidate;
      continue;
    }
    lines.push(current);
    if (estimateTextUnits(token) <= maxUnits) {
      current = token;
      continue;
    }
    const pieces = splitLongToken(token, maxUnits);
    lines.push(...pieces.slice(0, -1));
    current = pieces[pieces.length - 1] ?? "";
  }
  if (current) {
    lines.push(current);
  }
  return lines.join("\\N");
};

const wrapOverlayText = (
  overlay: Extract<RenderPlanOverlay, { type: "text" }>,
  output: RenderPlanOutput,
): string => {
  const widthPx = output.size.width * Math.max(0.2, overlay.placement.width);
  const fontSize = resolveOverlayFontSize(overlay, output);
  const maxUnits = Math.max(6, Math.floor(widthPx / Math.max(fontSize * 0.9, 1)));
  return wrapTextToWidth(overlay.text, maxUnits);
};

const wrapSubtitleText = (
  text: string,
  style: RenderPlanSubtitleStyle,
  output: RenderPlanOutput,
): string => {
  const widthPx = output.size.width * style.maxWidth;
  const fontSize = Math.max(12, style.fontSize);
  const maxUnits = Math.max(6, Math.floor(widthPx / Math.max(fontSize * 0.9, 1)));
  return wrapTextToWidth(text, maxUnits);
};

const buildTextOverlayEvents = (
  renderPlan: Pick<RenderPlan, "output" | "overlays" | "totalDurationSec">,
) => {
  const output = renderPlan.output ?? DEFAULT_RENDER_OUTPUT;
  return (renderPlan.overlays ?? [])
    .filter(
      (overlay): overlay is Extract<RenderPlanOverlay, { type: "text" }> =>
        overlay.type === "text" && overlay.text.trim().length > 0,
    )
    .map((overlay) => {
      const position = resolveTextOverlayPosition(overlay, output);
      const margins = resolveOverlayMargins(overlay, output);
      const bold = overlay.style.fontWeight === "bold" ? 1 : 0;
      const startSec = Math.max(0, overlay.startSec ?? 0);
      const endSec = Math.max(
        startSec,
        overlay.endSec ?? renderPlan.totalDurationSec ?? startSec,
      );
      return `Dialogue: ${overlay.zIndex ?? 5},${formatAssTimestamp(startSec)},${formatAssTimestamp(endSec)},Default,,${margins.left},${margins.right},0,,{\\an${position.alignment}\\pos(${position.x},${position.y})\\fn${overlay.style.fontFamily.replace(/,/g, " ")}\\fs${resolveOverlayFontSize(overlay, output)}\\b${bold}\\c${toAssColor(overlay.style.color, overlay.style.opacity ?? 1)}\\3c${toAssColor(overlay.style.strokeColor ?? "#000000", 1)}\\bord${Math.max(0, overlay.style.strokeWidth ?? 0)}}${escapeAssText(wrapOverlayText(overlay, output))}`;
    });
};

const buildSceneSubtitleSegments = (
  scene: Pick<
    RenderPlan["scenes"][number],
    "startSec" | "endSec" | "subtitle" | "subtitleSegments"
  >,
): RenderPlanSubtitleSegment[] => {
  const segments = scene.subtitleSegments?.filter(
    (segment) =>
      segment.endSec > segment.startSec && segment.text.trim().length > 0,
  );
  if (segments && segments.length > 0) {
    return segments;
  }
  const subtitle =
    typeof scene.subtitle === "string" ? scene.subtitle.trim() : "";
  if (!subtitle || scene.endSec <= scene.startSec) {
    return [];
  }
  return [
    {
      text: subtitle,
      startSec: scene.startSec,
      endSec: scene.endSec,
    },
  ];
};

export const hasSubtitleAssEntries = (
  renderPlan: Pick<RenderPlan, "scenes" | "overlays">,
) => {
  return (
    renderPlan.scenes.some((scene) => buildSceneSubtitleSegments(scene).length > 0) ||
    (renderPlan.overlays ?? []).some(
      (overlay) => overlay.type === "text" && overlay.text.trim().length > 0,
    )
  );
};

export const buildSubtitleAss = (
  renderPlan: Pick<
    RenderPlan,
    "output" | "scenes" | "subtitles" | "overlays" | "totalDurationSec"
  >,
): string => {
  const output = renderPlan.output ?? DEFAULT_RENDER_OUTPUT;
  const style = renderPlan.subtitles.style;
  const basePosition = resolveSubtitleBasePosition(style, output);
  const subtitleEvents = renderPlan.scenes
    .flatMap((scene) =>
      buildSceneSubtitleSegments(scene).map((segment) => ({
        startSec: segment.startSec,
        endSec: segment.endSec,
        subtitle: segment.text.trim(),
      })),
    )
    .filter(
      (scene) =>
        scene.subtitle.length > 0 &&
        typeof scene.startSec === "number" &&
        typeof scene.endSec === "number" &&
        scene.endSec > scene.startSec,
    )
    .map(
      (scene) =>
        `Dialogue: 0,${formatAssTimestamp(scene.startSec)},${formatAssTimestamp(scene.endSec)},Default,,0,0,0,,{\\an${basePosition.alignment}\\pos(${basePosition.x},${basePosition.y})}${escapeAssText(wrapSubtitleText(scene.subtitle, style, output))}`,
    );
  const overlayEvents = buildTextOverlayEvents(renderPlan);

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${output.size.width}`,
    `PlayResY: ${output.size.height}`,
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    buildAssStyleLine(style, output),
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    ...subtitleEvents,
    ...overlayEvents,
    "",
  ].join("\n");
};
