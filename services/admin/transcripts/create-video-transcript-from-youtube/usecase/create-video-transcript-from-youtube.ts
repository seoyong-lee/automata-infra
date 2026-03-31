import { randomUUID } from "crypto";

import { badUserInput } from "../../../../admin/shared/errors";
import { invokeStandaloneVideoTranscriptWorkerAsync } from "../../../../shared/lib/aws/invoke-standalone-video-transcript-worker";
import type { CreateVideoTranscriptFromYoutubeInput } from "../../../../shared/lib/contracts/standalone-video-transcript";
import { putStandaloneVideoTranscript } from "../../../../shared/lib/store/standalone-video-transcripts";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const buildTranscriptId = (): string => {
  return `transcript_${randomUUID().replace(/-/g, "")}`;
};

const extractVideoIdFromYoutubeUrl = (parsed: URL, host: string): string => {
  if (host.endsWith("youtu.be")) {
    return parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  }
  if (parsed.pathname === "/watch") {
    return parsed.searchParams.get("v")?.trim() ?? "";
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed"
    ? (parts[1] ?? "")
    : "";
};

const normalizeYoutubeUrl = (rawUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw badUserInput("youtubeUrl must be a valid URL");
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    throw badUserInput("youtubeUrl must be a YouTube URL");
  }

  const videoId = extractVideoIdFromYoutubeUrl(parsed, host);
  const normalizedVideoId = videoId.replace(/[^A-Za-z0-9_-]/g, "");
  if (!normalizedVideoId) {
    throw badUserInput("youtubeUrl must reference a specific video");
  }

  return `https://www.youtube.com/watch?v=${normalizedVideoId}`;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return "failed to enqueue YouTube transcript";
};

export const createVideoTranscriptFromYoutube = async (
  input: CreateVideoTranscriptFromYoutubeInput,
) => {
  const transcriptId = buildTranscriptId();
  const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
  const queuedAt = new Date().toISOString();

  const queuedRecord = {
    transcriptId,
    status: "QUEUED" as const,
    sourceType: "YOUTUBE_URL" as const,
    provider: "YT_DLP" as const,
    sourceUrl: youtubeUrl,
    languageCode: input.languageCode,
    createdAt: queuedAt,
    updatedAt: queuedAt,
  };

  await putStandaloneVideoTranscript(queuedRecord);

  try {
    await invokeStandaloneVideoTranscriptWorkerAsync({
      kind: "YOUTUBE_URL",
      transcriptId,
      youtubeUrl,
      preferredLanguage: input.languageCode,
    });
    return queuedRecord;
  } catch (error) {
    const failedRecord = {
      ...queuedRecord,
      status: "FAILED" as const,
      updatedAt: new Date().toISOString(),
      lastError: toErrorMessage(error),
    };
    await putStandaloneVideoTranscript(failedRecord);
    throw error;
  }
};
