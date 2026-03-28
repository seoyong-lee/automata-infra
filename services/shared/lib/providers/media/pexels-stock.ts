import { createHash } from "crypto";
import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry } from "../http/retry";

type PexelsSecret = {
  apiKey: string;
  endpoint?: string;
};

type PexelsPhoto = {
  id: number;
  url?: string;
  width?: number;
  height?: number;
  photographer?: string;
  alt?: string;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
  };
};

type PexelsVideoFile = {
  id?: number;
  quality?: string;
  file_type?: string;
  width?: number | null;
  height?: number | null;
  link?: string;
};

type PexelsVideo = {
  id: number;
  url?: string;
  image?: string;
  width?: number;
  height?: number;
  duration?: number;
  user?: {
    name?: string;
  };
  video_files?: PexelsVideoFile[];
};

const DEFAULT_PEXELS_ENDPOINT = "https://api.pexels.com";
const DEFAULT_IMAGE_CANDIDATE_COUNT = 2;
const DEFAULT_VIDEO_CANDIDATE_COUNT = 2;
const PEXELS_SEARCH_TIMEOUT_MS = 8000;

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "cinematic",
  "closeup",
  "close-up",
  "composition",
  "detail",
  "detailed",
  "dramatic",
  "drifting",
  "fog",
  "gentle",
  "glow",
  "haze",
  "highly",
  "hyperrealistic",
  "in",
  "lantern",
  "lighting",
  "mist",
  "moody",
  "motion",
  "night",
  "nighttime",
  "of",
  "pan",
  "photorealistic",
  "portrait",
  "push",
  "realism",
  "realistic",
  "shot",
  "silent",
  "slow",
  "still",
  "still-frame",
  "stillframe",
  "subtle",
  "tense",
  "toward",
  "vertical",
  "vibe",
  "with",
  "atmosphere",
]);

const hashText = (value: string): string => {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
};

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const stripLeadingCameraDirection = (value: string): string => {
  return value
    .replace(
      /^(slow|gentle|subtle)\s+(push|pan|dolly|zoom|tracking shot|camera move)\s+(toward|into|across|along|through)\s+/i,
      "",
    )
    .replace(/^(slow|gentle|subtle)\s+(push|pan|dolly|zoom)\s+/i, "")
    .replace(/^(cinematic|dramatic)\s+/i, "");
};

export const derivePexelsSearchQuery = (prompt: string): string | undefined => {
  const base = normalizeWhitespace(stripLeadingCameraDirection(prompt));
  if (!base) {
    return undefined;
  }

  const phrases = base
    .split(/[,;|]/)
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean)
    .slice(0, 2);
  const words = phrases
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !QUERY_STOP_WORDS.has(word));

  const deduped = Array.from(
    new Set(words.filter((word) => /[a-z0-9]/.test(word))),
  ).slice(0, 7);
  if (deduped.length < 2) {
    return undefined;
  }
  return deduped.join(" ");
};

const resolvePexelsLocale = (language?: string): string | undefined => {
  const normalized = language?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.startsWith("ko")) {
    return "ko-KR";
  }
  if (normalized.startsWith("ja")) {
    return "ja-JP";
  }
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("en")) {
    return "en-US";
  }
  return undefined;
};

const resolvePhotoDownloadUrl = (photo: PexelsPhoto): string | undefined => {
  return (
    photo.src?.large2x ??
    photo.src?.large ??
    photo.src?.original ??
    photo.src?.medium ??
    photo.src?.small
  );
};

const buildPexelsHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: apiKey,
});

const resolvePexelsSecret = async (secretId: string): Promise<PexelsSecret> => {
  const secret = await getSecretJson<PexelsSecret>(secretId);
  if (!secret?.apiKey) {
    throw new Error("PEXELS_SECRET_ID is not configured");
  }
  return secret;
};

const buildPhotoSearchUrl = (input: {
  endpoint: string;
  query: string;
  language?: string;
  perPage: number;
}): string => {
  const params = new URLSearchParams({
    query: input.query,
    page: "1",
    per_page: String(input.perPage),
    orientation: "portrait",
    size: "medium",
  });
  const locale = resolvePexelsLocale(input.language);
  if (locale) {
    params.set("locale", locale);
  }
  return `${input.endpoint}/v1/search?${params.toString()}`;
};

const buildVideoSearchUrl = (input: {
  endpoint: string;
  query: string;
  language?: string;
  targetDurationSec?: number;
  perPage: number;
}): string => {
  const params = new URLSearchParams({
    query: input.query,
    page: "1",
    per_page: String(input.perPage),
    orientation: "portrait",
    size: "medium",
  });
  if (typeof input.targetDurationSec === "number") {
    params.set(
      "min_duration",
      String(Math.max(2, Math.floor(input.targetDurationSec - 4))),
    );
    params.set(
      "max_duration",
      String(Math.max(6, Math.ceil(input.targetDurationSec + 6))),
    );
  }
  const locale = resolvePexelsLocale(input.language);
  if (locale) {
    params.set("locale", locale);
  }
  return `${input.endpoint}/v1/videos/search?${params.toString()}`;
};

const logSearchPayload = async (input: {
  jobId: string;
  sceneId: number;
  provider: "pexels-photo" | "pexels-video";
  query: string;
  requestUrl: string;
  payload: unknown;
  targetDurationSec?: number;
}): Promise<string> => {
  return putJsonToS3(
    `logs/${input.jobId}/provider/${input.provider}-scene-${input.sceneId}-${hashText(input.query)}.json`,
    {
      request: {
        url: input.requestUrl,
        query: input.query,
        ...(typeof input.targetDurationSec === "number"
          ? { targetDurationSec: input.targetDurationSec }
          : {}),
      },
      response: input.payload,
    },
  );
};

const downloadPhotoCandidate = async (input: {
  jobId: string;
  sceneId: number;
  createdAt: string;
  promptHash: string;
  providerLogS3Key: string;
  photo: PexelsPhoto;
}): Promise<Record<string, unknown> | undefined> => {
  const downloadUrl = resolvePhotoDownloadUrl(input.photo);
  if (!downloadUrl) {
    return undefined;
  }
  const candidateId = `pexels-photo-${input.photo.id}`;
  return {
    candidateId,
    createdAt: input.createdAt,
    provider: "pexels-photo",
    providerLogS3Key: input.providerLogS3Key,
    promptHash: input.promptHash,
    mocked: false,
    sourceUrl: downloadUrl,
    thumbnailUrl: input.photo.src?.medium ?? input.photo.src?.small,
    authorName: input.photo.photographer,
    sourceAssetId: String(input.photo.id),
    width: input.photo.width,
    height: input.photo.height,
  };
};

const downloadVideoCandidate = async (input: {
  jobId: string;
  sceneId: number;
  createdAt: string;
  promptHash: string;
  providerLogS3Key: string;
  video: PexelsVideo;
}): Promise<Record<string, unknown> | undefined> => {
  const bestFile = pickBestPexelsVideoFile(input.video);
  if (!bestFile?.link) {
    return undefined;
  }
  const candidateId = `pexels-video-${input.video.id}`;
  return {
    candidateId,
    createdAt: input.createdAt,
    provider: "pexels-video",
    providerLogS3Key: input.providerLogS3Key,
    promptHash: input.promptHash,
    mocked: false,
    sourceUrl: bestFile.link,
    thumbnailUrl: input.video.image,
    authorName: input.video.user?.name,
    sourceAssetId: String(input.video.id),
    width:
      typeof bestFile.width === "number" ? bestFile.width : input.video.width,
    height:
      typeof bestFile.height === "number"
        ? bestFile.height
        : input.video.height,
    durationSec: input.video.duration,
  };
};

const mapPhotoCandidatesSequentially = async (input: {
  jobId: string;
  sceneId: number;
  createdAt: string;
  promptHash: string;
  providerLogS3Key: string;
  photos: PexelsPhoto[];
}): Promise<Record<string, unknown>[]> => {
  const assets: Record<string, unknown>[] = [];
  for (const photo of input.photos) {
    const asset = await downloadPhotoCandidate({
      jobId: input.jobId,
      sceneId: input.sceneId,
      createdAt: input.createdAt,
      promptHash: input.promptHash,
      providerLogS3Key: input.providerLogS3Key,
      photo,
    });
    if (asset) {
      assets.push(asset);
    }
  }
  return assets;
};

const mapVideoCandidatesSequentially = async (input: {
  jobId: string;
  sceneId: number;
  createdAt: string;
  promptHash: string;
  providerLogS3Key: string;
  videos: PexelsVideo[];
}): Promise<Record<string, unknown>[]> => {
  const assets: Record<string, unknown>[] = [];
  for (const video of input.videos) {
    const asset = await downloadVideoCandidate({
      jobId: input.jobId,
      sceneId: input.sceneId,
      createdAt: input.createdAt,
      promptHash: input.promptHash,
      providerLogS3Key: input.providerLogS3Key,
      video,
    });
    if (asset) {
      assets.push(asset);
    }
  }
  return assets;
};

export const pickBestPexelsVideoFile = (
  video: PexelsVideo,
): PexelsVideoFile | undefined => {
  const files = (video.video_files ?? []).filter(
    (file) =>
      typeof file.link === "string" &&
      file.link.length > 0 &&
      typeof file.file_type === "string" &&
      file.file_type.includes("mp4"),
  );
  if (files.length === 0) {
    return undefined;
  }

  return files.sort((left, right) => {
    const leftPortrait =
      typeof left.width === "number" &&
      typeof left.height === "number" &&
      left.height >= left.width;
    const rightPortrait =
      typeof right.width === "number" &&
      typeof right.height === "number" &&
      right.height >= right.width;
    if (leftPortrait !== rightPortrait) {
      return rightPortrait ? 1 : -1;
    }

    const leftArea =
      typeof left.width === "number" && typeof left.height === "number"
        ? left.width * left.height
        : 0;
    const rightArea =
      typeof right.width === "number" && typeof right.height === "number"
        ? right.width * right.height
        : 0;
    return rightArea - leftArea;
  })[0];
};

export const searchPexelsPhotoCandidates = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  query: string;
  language?: string;
  secretId: string;
  perPage?: number;
}): Promise<Record<string, unknown>[]> => {
  const secret = await resolvePexelsSecret(input.secretId);
  const requestUrl = buildPhotoSearchUrl({
    endpoint: secret.endpoint ?? DEFAULT_PEXELS_ENDPOINT,
    query: input.query,
    language: input.language,
    perPage: input.perPage ?? DEFAULT_IMAGE_CANDIDATE_COUNT,
  });
  const payload = (await fetchJsonWithRetry(requestUrl, {
    method: "GET",
    headers: buildPexelsHeaders(secret.apiKey),
    signal: AbortSignal.timeout(PEXELS_SEARCH_TIMEOUT_MS),
  })) as {
    photos?: PexelsPhoto[];
    total_results?: number;
  };
  const providerLogS3Key = await logSearchPayload({
    jobId: input.jobId,
    sceneId: input.sceneId,
    provider: "pexels-photo",
    query: input.query,
    requestUrl,
    payload,
  });

  const createdAt = new Date().toISOString();
  const promptHash = hashText(input.prompt);
  return mapPhotoCandidatesSequentially({
    jobId: input.jobId,
    sceneId: input.sceneId,
    createdAt,
    promptHash,
    providerLogS3Key,
    photos: payload.photos ?? [],
  });
};

export const searchPexelsVideoCandidates = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  query: string;
  language?: string;
  targetDurationSec?: number;
  secretId: string;
  perPage?: number;
}): Promise<Record<string, unknown>[]> => {
  const secret = await resolvePexelsSecret(input.secretId);
  const requestUrl = buildVideoSearchUrl({
    endpoint: secret.endpoint ?? DEFAULT_PEXELS_ENDPOINT,
    query: input.query,
    language: input.language,
    targetDurationSec: input.targetDurationSec,
    perPage: input.perPage ?? DEFAULT_VIDEO_CANDIDATE_COUNT,
  });
  const payload = (await fetchJsonWithRetry(requestUrl, {
    method: "GET",
    headers: buildPexelsHeaders(secret.apiKey),
    signal: AbortSignal.timeout(PEXELS_SEARCH_TIMEOUT_MS),
  })) as {
    videos?: PexelsVideo[];
    total_results?: number;
  };
  const providerLogS3Key = await logSearchPayload({
    jobId: input.jobId,
    sceneId: input.sceneId,
    provider: "pexels-video",
    query: input.query,
    requestUrl,
    payload,
    targetDurationSec: input.targetDurationSec,
  });

  const createdAt = new Date().toISOString();
  const promptHash = hashText(input.prompt);
  return mapVideoCandidatesSequentially({
    jobId: input.jobId,
    sceneId: input.sceneId,
    createdAt,
    promptHash,
    providerLogS3Key,
    videos: payload.videos ?? [],
  });
};
