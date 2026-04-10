import { promises as fs } from "node:fs";
import { seconds } from "../normalize/render-plan.mjs";

const PREVIEW_TEXT_REFERENCE_SHORT_EDGE = 320;

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
    .replace(/\r\n|\r|\n/g, "\\N");
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
    return 4;
  }
  if (align === "right") {
    return 6;
  }
  return 5;
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
  const yRatio =
    Number(overlay.placement?.y ?? 0) + Number(overlay.placement?.height ?? 0) / 2;
  return {
    x: Math.max(0, Math.min(outputSettings.width, Math.round(outputSettings.width * xRatio))),
    y: Math.max(
      0,
      Math.min(
        outputSettings.height,
        Math.round(outputSettings.height * yRatio),
      ),
    ),
    alignment: resolveTextOverlayAlignment(align),
  };
}

function resolveOverlayFontSize(overlay, outputSettings) {
  const rawFontSize = Math.max(12, Number(overlay.style?.fontSize ?? 32));
  const outputShortEdge = Math.min(outputSettings.width, outputSettings.height);
  return Math.round(rawFontSize * (outputShortEdge / PREVIEW_TEXT_REFERENCE_SHORT_EDGE));
}

function estimateCharUnits(char) {
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
}

function estimateTextUnits(value) {
  return [...String(value)].reduce((sum, char) => sum + estimateCharUnits(char), 0);
}

const MAX_SUBTITLE_DISPLAY_LINES = 2;
const ELLIPSIS = "…";

function splitLongToken(token, maxUnits) {
  const parts = [];
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
}

function truncateWithEllipsis(text, maxUnits) {
  const trimmed = String(text).replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }
  if (estimateTextUnits(trimmed) <= maxUnits) {
    return trimmed;
  }
  const ellUnits = estimateTextUnits(ELLIPSIS);
  const budget = Math.max(1, maxUnits - ellUnits);
  let low = 0;
  let high = [...trimmed].length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const slice = [...trimmed].slice(0, mid).join("");
    if (estimateTextUnits(slice) <= budget) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  const slice = [...trimmed].slice(0, low).join("").replace(/\s+$/, "");
  return slice ? `${slice}${ELLIPSIS}` : ELLIPSIS;
}

function firstLineAndRestTokens(normalized, maxUnits) {
  const tokens = normalized.split(" ");
  let current = "";
  let i = 0;
  for (; i < tokens.length; i++) {
    const token = tokens[i];
    const candidate = current ? `${current} ${token}` : token;
    if (estimateTextUnits(candidate) <= maxUnits) {
      current = candidate;
    } else {
      break;
    }
  }
  if (current) {
    return { first: current, restTokens: tokens.slice(i) };
  }
  if (i >= tokens.length) {
    return { first: "", restTokens: [] };
  }
  const token = tokens[i];
  const pieces = splitLongToken(token, maxUnits);
  const first = pieces[0] ?? "";
  const tailFromWord = pieces.length > 1 ? pieces.slice(1).join("") : "";
  const restTokens = [];
  if (tailFromWord) {
    restTokens.push(tailFromWord);
  }
  restTokens.push(...tokens.slice(i + 1));
  return { first, restTokens };
}

function splitIntoTwoLineChunks(normalized, maxUnits) {
  const text = String(normalized).replace(/\s+/g, " ").trim();
  if (!text) {
    return [];
  }
  const chunks = [];
  let remaining = text;
  for (let guard = 0; guard < 400 && remaining.length > 0; guard++) {
    const { first, restTokens } = firstLineAndRestTokens(remaining, maxUnits);
    const restJoined = restTokens.join(" ").trim();
    if (!restJoined) {
      if (first) {
        chunks.push(first);
      }
      break;
    }
    const secondPass = firstLineAndRestTokens(restJoined, maxUnits);
    const line2 = secondPass.first;
    const afterTwo = secondPass.restTokens.join(" ").trim();
    if (first && line2) {
      chunks.push(`${first}\n${line2}`);
    } else if (first) {
      chunks.push(first);
    } else if (line2) {
      chunks.push(line2);
    }
    if (afterTwo === remaining) {
      if (afterTwo) {
        chunks.push(afterTwo);
      }
      break;
    }
    if (afterTwo.length >= remaining.length) {
      if (afterTwo) {
        chunks.push(afterTwo);
      }
      break;
    }
    remaining = afterTwo;
  }
  return chunks;
}

function assignSubtitleDisplayChunks(startSec, endSec, chunks) {
  const totalDur = Math.max(0.05, endSec - startSec);
  if (chunks.length === 0) {
    return [];
  }
  if (chunks.length === 1) {
    return [{ startSec, endSec, text: chunks[0] }];
  }
  const n = chunks.length;
  const weights = chunks.map((c) => Math.max(1e-6, estimateTextUnits(c)));
  const totalW = weights.reduce((a, b) => a + b, 0);
  const minPer = Math.min(0.55, totalDur / Math.max(n * 2, 1));
  const rawDurs = weights.map((w) => totalDur * (w / totalW));
  const adjusted = rawDurs.map((d) => Math.max(minPer, d));
  const sumAdj = adjusted.reduce((a, b) => a + b, 0);
  const scale = sumAdj > 0 ? totalDur / sumAdj : 1;
  const finalDurs = adjusted.map((d) => d * scale);
  const edges = [startSec];
  for (let i = 0; i < n - 1; i++) {
    edges.push(edges[i] + finalDurs[i]);
  }
  edges.push(endSec);
  return chunks.map((text, i) => ({
    startSec: edges[i],
    endSec: edges[i + 1],
    text,
  }));
}

function wrapTextToWidthUnlimited(normalized, maxUnits) {
  if (estimateTextUnits(normalized) <= maxUnits) {
    return normalized;
  }
  const tokens = normalized.split(" ");
  const lines = [];
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
  return lines.join("\n");
}

function wrapTextToWidth(text, maxUnits, maxLines = Number.POSITIVE_INFINITY) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (!Number.isFinite(maxLines) || maxLines > 99) {
    return wrapTextToWidthUnlimited(normalized, maxUnits);
  }
  if (maxLines < 1) {
    return "";
  }
  if (maxLines === 1) {
    return truncateWithEllipsis(normalized, maxUnits);
  }
  if (estimateTextUnits(normalized) <= maxUnits) {
    return normalized;
  }
  if (maxLines === MAX_SUBTITLE_DISPLAY_LINES) {
    const chunks = splitIntoTwoLineChunks(normalized, maxUnits);
    return chunks[0] ?? normalized;
  }
  return wrapTextToWidthUnlimited(normalized, maxUnits);
}

function resolveSubtitleMaxUnits(subtitleSettings, outputSettings) {
  const widthPx =
    outputSettings.width * Number(subtitleSettings.style.maxWidth ?? 0.88);
  const fontSize = Math.max(12, Number(subtitleSettings.style.fontSize ?? 32));
  return Math.max(6, Math.floor(widthPx / Math.max(fontSize * 0.9, 1)));
}

function wrapOverlayText(text, overlay, outputSettings) {
  const widthPx =
    outputSettings.width * Math.max(0.2, Number(overlay.placement?.width ?? 0.72));
  const fontSize = resolveOverlayFontSize(overlay, outputSettings);
  const maxUnits = Math.max(6, Math.floor(widthPx / Math.max(fontSize * 0.9, 1)));
  const rawMaxLines = Number(overlay.style?.maxLines);
  const maxLines =
    Number.isFinite(rawMaxLines) && rawMaxLines >= 1 && rawMaxLines <= 99
      ? rawMaxLines
      : Number.POSITIVE_INFINITY;
  return wrapTextToWidth(text, maxUnits, maxLines);
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

function getSceneTextOverlayEvents(
  scene,
  overlays,
  outputSettings,
  renderedDurationSec,
) {
  const sceneStartSec = Number(scene.startSec ?? 0);
  /** Per-scene clip length (may exceed planned scene.endSec when TTS runs long). */
  const sceneEndSec =
    sceneStartSec + Math.max(0.1, Number(renderedDurationSec));
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
      const wrappedText = wrapOverlayText(overlay.text, overlay, outputSettings);
      return `Dialogue: ${Number(overlay.zIndex ?? 5)},${formatAssTime(startSec)},${formatAssTime(endSec)},Default,,${margins.left},${margins.right},0,,{\\an${position.alignment}\\pos(${position.x},${position.y})\\fn${String(overlay.style?.fontFamily ?? "Clear Sans").replace(/,/g, " ")}\\fs${resolveOverlayFontSize(overlay, outputSettings)}\\b${bold}\\c${assColor(overlay.style?.color ?? "#FFFFFF", Number(overlay.style?.opacity ?? 1))}\\3c${assColor(overlay.style?.strokeColor ?? "#000000", 1)}\\bord${Math.max(0, Number(overlay.style?.strokeWidth ?? 0))}}${escapeAssText(wrappedText)}`;
    });
}

function normalizeSceneSubtitleSegments(scene) {
  const EPS = 1e-4;
  const sceneStartFallback = Number(scene.startSec ?? 0);
  const sceneEndFallback = Number(
    scene.endSec ?? sceneStartFallback + sceneDuration(scene),
  );
  const raw = Array.isArray(scene.subtitleSegments)
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
            Number.isFinite(segment.endSec),
        )
        .sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec)
    : [];
  if (raw.length === 0) {
    const text = String(scene.subtitle ?? "").trim();
    if (!text) {
      return [];
    }
    return [
      {
        text,
        startSec: sceneStartFallback,
        endSec: Math.max(sceneEndFallback, sceneStartFallback + 0.1),
      },
    ];
  }
  const merged = [];
  let pendingTexts = [];
  for (const seg of raw) {
    const dur = seg.endSec - seg.startSec;
    if (dur <= EPS) {
      pendingTexts.push(seg.text);
      continue;
    }
    const prefix = pendingTexts.length ? `${pendingTexts.join(" ")} ` : "";
    pendingTexts = [];
    merged.push({
      text: `${prefix}${seg.text}`.trim(),
      startSec: seg.startSec,
      endSec: seg.endSec,
    });
  }
  if (pendingTexts.length > 0) {
    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      last.text = `${last.text} ${pendingTexts.join(" ")}`.trim();
      last.endSec = Math.max(last.endSec, last.startSec + 0.08);
    } else {
      merged.push({
        text: pendingTexts.join(" ").trim(),
        startSec: sceneStartFallback,
        endSec: Math.max(sceneEndFallback, sceneStartFallback + 0.1),
      });
    }
  }
  return merged.filter(
    (segment) =>
      segment.text && segment.endSec > segment.startSec + EPS,
  );
}

const ASS_DEBUG_MAX_CHARS = 200_000;

/**
 * @param {object | null | undefined} diag
 * When `diag.storageRepo.putJson` and `diag.jobId` are set, writes ASS + timing metadata to S3 for subtitle triage.
 */
export async function writeSceneAss(
  scene,
  subtitleSettings,
  outputSettings,
  assPath,
  overlays = [],
  renderedDurationSec = sceneDuration(scene),
  ttsLeadInSec = 0,
  diag = undefined,
) {
  const leadInSec = Math.max(0, Number(ttsLeadInSec) || 0);
  const safeRenderedDuration = Math.max(0.1, Number(renderedDurationSec));
  const sceneStartGlobal = Number(scene.startSec ?? 0);
  const sceneEndPlannedGlobal = Number(
    scene.endSec ?? sceneStartGlobal + sceneDuration(scene),
  );
  const plannedSpanSec = Math.max(
    1e-3,
    sceneEndPlannedGlobal - sceneStartGlobal,
  );
  const outputContentSpanSec = Math.max(
    1e-3,
    safeRenderedDuration - leadInSec,
  );
  /** Map global plan times into local ASS timeline [leadIn, safeRendered]. */
  const mapPlanGlobalToAssLocal = (globalSec) => {
    const u = (globalSec - sceneStartGlobal) / plannedSpanSec;
    const clampedU = Math.max(0, Math.min(1, u));
    return leadInSec + clampedU * outputContentSpanSec;
  };
  /** Map scene-local segment times (0…scene duration) into ASS timeline. */
  const mapSegmentLocalToAssTimeline = (localSec) => {
    const u = localSec / plannedSpanSec;
    const clampedU = Math.max(0, Math.min(1, u));
    return leadInSec + clampedU * outputContentSpanSec;
  };
  const subtitleSegments = normalizeSceneSubtitleSegments(scene);
  const minSegStart =
    subtitleSegments.length > 0
      ? Math.min(...subtitleSegments.map((s) => s.startSec))
      : 0;
  const maxSegEnd =
    subtitleSegments.length > 0
      ? Math.max(...subtitleSegments.map((s) => s.endSec))
      : 0;
  /**
   * subtitleSegments from buildRenderPlan use global timeline; some pipelines emit scene-local 0…duration.
   * If we treat local times as global, mapPlanGlobalToAssLocal clamps most events to t=0 and only the last line shows.
   */
  const clearlyGlobalTimestamps =
    subtitleSegments.length > 0 &&
    minSegStart >= sceneStartGlobal - 0.5;
  const localSpanCeil =
    Math.max(plannedSpanSec, outputContentSpanSec) + 1.25;
  const segmentsLookLocal =
    subtitleSegments.length > 0 &&
    !clearlyGlobalTimestamps &&
    minSegStart >= -0.01 &&
    maxSegEnd <= localSpanCeil;
  const toAssTimeline = (sec) =>
    segmentsLookLocal
      ? mapSegmentLocalToAssTimeline(sec)
      : mapPlanGlobalToAssLocal(sec);
  const overlayEvents = getSceneTextOverlayEvents(
    scene,
    overlays,
    outputSettings,
    safeRenderedDuration,
  );
  const alignment = resolveSubtitleAlignment(subtitleSettings.style.position);
  const posX = Math.round(
    outputSettings.width * (0.5 + subtitleSettings.style.offsetX),
  );
  const posY = Math.round(
    outputSettings.height *
      (resolveSubtitleBaseYRatio(subtitleSettings.style.position) +
        subtitleSettings.style.offsetY),
  );
  const maxUnits = resolveSubtitleMaxUnits(subtitleSettings, outputSettings);
  const subtitleEvents =
    !subtitleSettings.burnIn || subtitleSegments.length === 0
      ? []
      : subtitleSegments.flatMap((segment) => {
          const segmentStartSec = Math.max(0, toAssTimeline(segment.startSec));
          const mappedEnd = toAssTimeline(segment.endSec);
          const lastSegment = subtitleSegments[subtitleSegments.length - 1];
          const isLastSegment = Boolean(lastSegment && segment === lastSegment);
          const singleFullScene =
            subtitleSegments.length === 1 &&
            (segmentsLookLocal
              ? segment.startSec <= 0.02
              : segment.startSec <= sceneStartGlobal + 1e-3);
          const segmentEndSec = Math.max(
            segmentStartSec + 0.05,
            singleFullScene || isLastSegment
              ? safeRenderedDuration
              : Math.min(safeRenderedDuration, mappedEnd),
          );
          const trimmed = String(segment.text ?? "").trim();
          if (!trimmed) {
            return [];
          }
          const chunks = splitIntoTwoLineChunks(trimmed, maxUnits);
          const timed = assignSubtitleDisplayChunks(
            segmentStartSec,
            segmentEndSec,
            chunks,
          );
          return timed.map(
            (row) =>
              `Dialogue: 0,${formatAssTime(row.startSec)},${formatAssTime(row.endSec)},Default,,0,0,0,,{\\pos(${posX},${posY})}${escapeAssText(row.text)}`,
          );
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
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,${subtitleSettings.style.fontFamily},${subtitleSettings.style.fontSize},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.color, subtitleSettings.style.opacity)},${assColor(subtitleSettings.style.strokeColor, 1)},&H00000000&,${assBold},0,0,0,100,100,0,0,1,${subtitleSettings.style.strokeWidth},0,${alignment},${subtitleMargins.left},${subtitleMargins.right},48,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${[...subtitleEvents, ...overlayEvents].join("\n")}
`;
  await fs.writeFile(assPath, content, "utf8");
  const putJson = diag?.storageRepo?.putJson;
  const diagJobId = diag?.jobId;
  if (typeof putJson === "function" && typeof diagJobId === "string" && diagJobId) {
    const assContent =
      content.length > ASS_DEBUG_MAX_CHARS
        ? `${content.slice(0, ASS_DEBUG_MAX_CHARS)}\n\n…[truncated ${content.length - ASS_DEBUG_MAX_CHARS} chars]`
        : content;
    try {
      await putJson(
        `logs/${diagJobId}/composition/scene-${scene.sceneId}-ass-debug.json`,
        {
          at: new Date().toISOString(),
          sceneId: scene.sceneId,
          assPath,
          sceneStartGlobal,
          sceneEndPlannedGlobal,
          plannedSpanSec,
          outputContentSpanSec,
          safeRenderedDuration,
          leadInSec,
          clearlyGlobalTimestamps,
          segmentsLookLocal,
          localSpanCeil,
          minSegStart,
          maxSegEnd,
          subtitleSegmentsRaw: scene.subtitleSegments ?? null,
          subtitleSegmentsNormalized: subtitleSegments,
          subtitle: scene.subtitle ?? null,
          assContent,
        },
      );
    } catch {
      /* best-effort diagnostic */
    }
  }
  return true;
}

export function subtitlesFilter(assPath) {
  const escaped = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
  return `subtitles='${escaped}'`;
}
