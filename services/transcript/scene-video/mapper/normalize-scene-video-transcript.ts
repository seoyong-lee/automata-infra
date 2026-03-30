import {
  normalizedSceneVideoTranscriptSchema,
  type NormalizedSceneVideoTranscript,
  type SceneVideoTranscriptProvider,
  type SceneVideoTranscriptSegment,
} from "../../../shared/lib/contracts/video-transcript";

const VTT_TIMECODE_RE =
  /^(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/;

const toSeconds = (value: string): number => {
  const [timePart, millisPart = "0"] = value.split(".");
  const segments = timePart.split(":").map((segment) => Number(segment));
  const [hours, minutes, seconds] =
    segments.length === 3 ? segments : [0, segments[0] ?? 0, segments[1] ?? 0];
  return hours * 3600 + minutes * 60 + seconds + Number(millisPart) / 1000;
};

const toVttTimestamp = (value: number): string => {
  const totalMillis = Math.max(0, Math.round(value * 1000));
  const hours = Math.floor(totalMillis / 3600000);
  const minutes = Math.floor((totalMillis % 3600000) / 60000);
  const seconds = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

const toSrtTimestamp = (value: number): string => {
  return toVttTimestamp(value).replace(".", ",");
};

export const parseVttSegments = (
  vttText: string,
): SceneVideoTranscriptSegment[] => {
  const lines = vttText.replace(/\r/g, "").split("\n");
  const segments: SceneVideoTranscriptSegment[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const match = VTT_TIMECODE_RE.exec(line);
    if (!match) {
      continue;
    }

    const textLines: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor] ?? "";
      if (nextLine.trim().length === 0) {
        index = cursor;
        break;
      }
      textLines.push(nextLine.trim());
      index = cursor;
    }

    const text = textLines.join(" ").trim();
    if (!text) {
      continue;
    }

    segments.push({
      startSec: toSeconds(match[1]),
      endSec: toSeconds(match[2]),
      text,
    });
  }

  return segments;
};

export const buildVttFromSegments = (
  segments: SceneVideoTranscriptSegment[],
): string => {
  const blocks = segments.map((segment) => {
    return `${toVttTimestamp(segment.startSec)} --> ${toVttTimestamp(segment.endSec)}\n${segment.text}`;
  });
  return `WEBVTT\n\n${blocks.join("\n\n")}`.trimEnd() + "\n";
};

export const buildSrtFromSegments = (
  segments: SceneVideoTranscriptSegment[],
): string => {
  return (
    segments
      .map((segment, index) => {
        return `${index + 1}\n${toSrtTimestamp(segment.startSec)} --> ${toSrtTimestamp(segment.endSec)}\n${segment.text}`;
      })
      .join("\n\n")
      .trimEnd() + (segments.length > 0 ? "\n" : "")
  );
};

const readPlainText = (providerTranscript: unknown): string => {
  if (!providerTranscript || typeof providerTranscript !== "object") {
    return "";
  }
  const transcripts = (
    providerTranscript as { results?: { transcripts?: unknown[] } }
  ).results?.transcripts;
  if (!Array.isArray(transcripts)) {
    return "";
  }
  const first = transcripts.find(
    (item): item is { transcript?: string } =>
      !!item && typeof item === "object" && "transcript" in item,
  );
  return typeof first?.transcript === "string" ? first.transcript.trim() : "";
};

export const normalizeSceneVideoTranscriptArtifact = (input: {
  provider: SceneVideoTranscriptProvider;
  providerJobId: string;
  sourceS3Key?: string;
  sourceUrl?: string;
  languageCode?: string;
  providerTranscript: unknown;
  vttText: string;
}): NormalizedSceneVideoTranscript => {
  const segments = parseVttSegments(input.vttText);
  const text = readPlainText(input.providerTranscript);
  return normalizedSceneVideoTranscriptSchema.parse({
    provider: input.provider,
    providerJobId: input.providerJobId,
    sourceS3Key: input.sourceS3Key,
    sourceUrl: input.sourceUrl,
    languageCode: input.languageCode,
    text:
      text ||
      segments
        .map((segment) => segment.text)
        .join(" ")
        .trim(),
    segments,
    generatedAt: new Date().toISOString(),
  });
};
