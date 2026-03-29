import { promises as fs } from "node:fs";
import { seconds } from "../normalize/render-plan.mjs";

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function sceneDuration(scene) {
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

export async function writeSceneAss(
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

export function subtitlesFilter(assPath) {
  const escaped = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
  return `subtitles='${escaped}'`;
}
