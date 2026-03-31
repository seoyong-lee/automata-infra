import { getItem, putItem } from "../aws/runtime";
import {
  parseStandaloneVideoTranscript,
  type StandaloneVideoTranscript,
} from "../contracts/standalone-video-transcript";

const INVALID_FILE_CHARS_RE = /[^A-Za-z0-9._-]+/g;

export type StandaloneVideoTranscriptItem = StandaloneVideoTranscript & {
  PK: string;
  SK: "META";
};

const sanitizeFileName = (fileName: string, fallback: string): string => {
  const base = fileName.split("/").pop() ?? fileName;
  const normalized = base
    .replace(INVALID_FILE_CHARS_RE, "-")
    .replace(/-+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || fallback;
};

export const standaloneVideoTranscriptPk = (transcriptId: string): string => {
  return `TRANSCRIPT#${transcriptId}`;
};

export const buildStandaloneTranscriptUploadSourceKey = (input: {
  transcriptId: string;
  fileName: string;
}): string => {
  const timestamp = Date.now();
  return `assets/transcripts/${input.transcriptId}/source/${timestamp}-${sanitizeFileName(input.fileName, "video.mp4")}`;
};

const toTranscriptItem = (
  record: StandaloneVideoTranscript,
): StandaloneVideoTranscriptItem => {
  return {
    PK: standaloneVideoTranscriptPk(record.transcriptId),
    SK: "META",
    ...record,
  };
};

const withoutUndefined = <T extends Record<string, unknown>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
};

const fromTranscriptItem = (
  item: StandaloneVideoTranscriptItem | null,
): StandaloneVideoTranscript | null => {
  if (!item) {
    return null;
  }

  const { PK: _pk, SK: _sk, ...record } = item;
  return parseStandaloneVideoTranscript(record);
};

export const putStandaloneVideoTranscript = async (
  record: StandaloneVideoTranscript,
): Promise<void> => {
  await putItem(withoutUndefined(toTranscriptItem(record)));
};

export const getStandaloneVideoTranscript = async (
  transcriptId: string,
): Promise<StandaloneVideoTranscript | null> => {
  const item = await getItem<StandaloneVideoTranscriptItem>({
    PK: standaloneVideoTranscriptPk(transcriptId),
    SK: "META",
  });
  return fromTranscriptItem(item);
};
