/** Avoid dozens of micro-phrases that break timing on short scenes. */
export const MAX_PHRASE_SEGMENTS = 14;

const splitLongSubtitleByWords = (normalized: string): string[] => {
  const bySpace = normalized.split(/\s+/).filter((w) => w.length > 0);
  if (bySpace.length <= 6) {
    return [];
  }
  const out: string[] = [];
  let buf = "";
  for (const w of bySpace) {
    const next = buf ? `${buf} ${w}` : w;
    if (next.length > 44 && buf) {
      out.push(buf);
      buf = w;
    } else {
      buf = next;
    }
  }
  if (buf) {
    out.push(buf);
  }
  return out.length > 1 ? out : [];
};

export const splitSubtitleIntoPhrases = (subtitle: string): string[] => {
  const normalized = subtitle.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const sentenceMatches = normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g);
  const sentences = (sentenceMatches ?? [normalized])
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (sentences.length > 1) {
    return sentences;
  }
  const byClause = normalized
    .split(/[,;，、:]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (byClause.length > 1) {
    return byClause;
  }
  if (normalized.length > 52) {
    const wordChunks = splitLongSubtitleByWords(normalized);
    if (wordChunks.length > 1) {
      return wordChunks;
    }
  }
  return [normalized];
};

export const mergePhraseParts = (parts: string[]): string[] => {
  if (parts.length <= MAX_PHRASE_SEGMENTS) {
    return parts;
  }
  const merged: string[] = [];
  const groupSize = Math.ceil(parts.length / MAX_PHRASE_SEGMENTS);
  for (let i = 0; i < parts.length; i += groupSize) {
    merged.push(parts.slice(i, i + groupSize).join(" "));
  }
  return merged;
};
