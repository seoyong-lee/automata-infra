import type {
  ElevenLabsCharAlignment,
  ElevenLabsStoredAlignmentDocument,
} from "../../../shared/lib/contracts/elevenlabs-tts-alignment";
import { resolveElevenLabsCharAlignment } from "../../../shared/lib/contracts/elevenlabs-tts-alignment";
import type { RenderPlanSubtitleSegment } from "../../../../types/render/render-plan";
import {
  mergePhraseParts,
  splitSubtitleIntoPhrases,
} from "./subtitle-phrase-parts";

const MIN_SEG_SEC = 0.05;

const buildAlignedFullText = (a: ElevenLabsCharAlignment): string =>
  a.characters.join("");

/** Collapse spaces + NFKC so vendor text matches scene JSON despite compatibility variants. */
const canonText = (s: string): string =>
  s.replace(/\s+/g, " ").trim().normalize("NFKC");

const findPhraseRangeInAlignedText = (
  alignedText: string,
  phrase: string,
  searchFrom: number,
): { start: number; end: number } | null => {
  const trimmed = phrase.trim();
  if (!trimmed) {
    return null;
  }
  let idx = alignedText.indexOf(trimmed, searchFrom);
  if (idx < 0) {
    idx = alignedText.indexOf(trimmed);
  }
  if (idx < 0) {
    return null;
  }
  return { start: idx, end: idx + trimmed.length };
};

const timeRangeForCharIndices = (
  alignment: ElevenLabsCharAlignment,
  startIdx: number,
  endIdxExclusive: number,
): { startSec: number; endSec: number } | null => {
  const n = alignment.characters.length;
  if (
    startIdx < 0 ||
    endIdxExclusive <= startIdx ||
    endIdxExclusive > n
  ) {
    return null;
  }
  const startSec = alignment.character_start_times_seconds[startIdx]!;
  const endSec =
    alignment.character_end_times_seconds[endIdxExclusive - 1]!;
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return null;
  }
  if (endSec < startSec) {
    return { startSec, endSec: startSec + MIN_SEG_SEC };
  }
  return { startSec, endSec };
};

const pickPhraseSourceForAlignment = (input: {
  rawAligned: string;
  subtitle: string;
  narration?: string;
  sourceText?: string;
}): string | undefined => {
  const key = canonText(input.rawAligned);
  const tryKeys: string[] = [];
  const push = (s: string | undefined) => {
    if (typeof s !== "string") {
      return;
    }
    const t = s.replace(/\s+/g, " ").trim();
    if (t.length > 0) {
      tryKeys.push(t);
    }
  };
  push(input.subtitle);
  push(input.narration);
  push(input.sourceText);
  for (const candidate of tryKeys) {
    if (canonText(candidate) === key) {
      return candidate;
    }
  }
  return undefined;
};

/**
 * Builds subtitle segments from ElevenLabs character timestamps when the aligned
 * text matches subtitle, narration, or persisted `sourceText` (NFKC-normalized).
 * Otherwise returns `undefined` (caller falls back to heuristic timing).
 */
export const tryBuildSubtitleSegmentsFromElevenLabs = (input: {
  subtitle: string;
  /** TTS source line; when subtitle differs only by compatibility chars, this still matches. */
  narration?: string;
  sceneStartSec: number;
  sceneEndSec: number;
  elevenLabsDocument: ElevenLabsStoredAlignmentDocument;
}): RenderPlanSubtitleSegment[] | undefined => {
  const {
    subtitle,
    narration,
    sceneStartSec,
    sceneEndSec,
    elevenLabsDocument,
  } = input;
  if (sceneEndSec <= sceneStartSec + 1e-6) {
    return undefined;
  }
  const alignment = resolveElevenLabsCharAlignment(elevenLabsDocument);
  if (!alignment) {
    return undefined;
  }
  const rawAligned = buildAlignedFullText(alignment);
  const phraseSource = pickPhraseSourceForAlignment({
    rawAligned,
    subtitle,
    narration,
    sourceText:
      typeof elevenLabsDocument.sourceText === "string"
        ? elevenLabsDocument.sourceText
        : undefined,
  });
  if (!phraseSource) {
    return undefined;
  }

  let parts = splitSubtitleIntoPhrases(
    phraseSource.replace(/\s+/g, " ").trim(),
  );
  parts = mergePhraseParts(parts);
  if (parts.length === 0) {
    return undefined;
  }

  const segments: RenderPlanSubtitleSegment[] = [];
  let searchFrom = 0;
  for (const part of parts) {
    const range = findPhraseRangeInAlignedText(
      rawAligned,
      part,
      searchFrom,
    );
    if (!range) {
      return undefined;
    }
    const times = timeRangeForCharIndices(
      alignment,
      range.start,
      range.end,
    );
    if (!times) {
      return undefined;
    }
    const globalStart = sceneStartSec + times.startSec;
    const globalEnd = sceneStartSec + times.endSec;
    const clippedStart = Math.max(sceneStartSec, globalStart);
    const clippedEnd = Math.min(
      sceneEndSec,
      Math.max(clippedStart + MIN_SEG_SEC, globalEnd),
    );
    segments.push({
      text: part.trim(),
      startSec: clippedStart,
      endSec: clippedEnd,
    });
    searchFrom = range.end;
  }

  for (let i = 0; i < segments.length; i += 1) {
    const cur = segments[i]!;
    if (i > 0) {
      const prev = segments[i - 1]!;
      if (cur.startSec < prev.endSec) {
        const mid = (prev.endSec + cur.startSec) / 2;
        prev.endSec = Math.max(prev.startSec + MIN_SEG_SEC, mid);
        cur.startSec = Math.min(cur.endSec - MIN_SEG_SEC, mid);
      }
    }
    if (cur.endSec <= cur.startSec) {
      cur.endSec = cur.startSec + MIN_SEG_SEC;
    }
  }
  const last = segments[segments.length - 1]!;
  if (last.endSec > sceneEndSec) {
    last.endSec = sceneEndSec;
  }
  if (last.endSec <= last.startSec) {
    last.endSec = Math.min(sceneEndSec, last.startSec + MIN_SEG_SEC);
  }
  return segments;
};
