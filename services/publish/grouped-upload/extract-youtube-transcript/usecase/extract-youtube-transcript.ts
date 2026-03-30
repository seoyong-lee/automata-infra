import { invokeSceneVideoTranscriptWorkerAsync } from "../../../../shared/lib/aws/invoke-scene-video-transcript-worker";
import type { SceneVideoTranscript } from "../../../../shared/lib/contracts/video-transcript";
import {
  getSceneAsset,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../../admin/shared/usecase/get-job-draft-view";
import { badUserInput, notFound } from "../../../../admin/shared/errors";
import { getJobOrThrow } from "../../../../admin/shared/repo/job-draft-store";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

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

const buildQueuedTranscript = (input: {
  sourceUrl: string;
  updatedAt: string;
}): SceneVideoTranscript => ({
  status: "QUEUED",
  provider: "YT_DLP",
  sourceUrl: input.sourceUrl,
  updatedAt: input.updatedAt,
});

export const extractYoutubeTranscript = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
}) => {
  const job = await getJobOrThrow(input.jobId);
  const existingSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!existingSceneAsset) {
    throw notFound("scene asset not found");
  }

  const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
  const queuedAt = new Date().toISOString();
  const queuedTranscript = buildQueuedTranscript({
    sourceUrl: youtubeUrl,
    updatedAt: queuedAt,
  });

  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoTranscript: queuedTranscript,
  });

  try {
    await invokeSceneVideoTranscriptWorkerAsync({
      kind: "YOUTUBE_URL",
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl,
      preferredLanguage: job.language,
    });
    console.info(
      JSON.stringify({
        scope: "scene-video-transcript",
        action: "youtube_queued",
        jobId: input.jobId,
        sceneId: input.sceneId,
        youtubeUrl,
      }),
    );
  } catch (error) {
    await upsertSceneAsset(input.jobId, input.sceneId, {
      videoTranscript: {
        ...queuedTranscript,
        status: "FAILED",
        updatedAt: new Date().toISOString(),
        lastError: toErrorMessage(error),
      },
    });
    console.error(
      JSON.stringify({
        scope: "scene-video-transcript",
        action: "youtube_queue_failed",
        jobId: input.jobId,
        sceneId: input.sceneId,
        youtubeUrl,
        error: toErrorMessage(error),
      }),
    );
    throw error;
  }

  return getJobDraftView(input.jobId);
};
