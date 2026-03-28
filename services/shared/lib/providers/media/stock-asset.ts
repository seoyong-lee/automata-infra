import { fetchWithRetry } from "../http/retry";
import { putBufferToS3 } from "../../aws/runtime";

const REMOTE_DOWNLOAD_TIMEOUT_MS = 20000;

const extensionFromContentType = (
  contentType: string,
  fallback: string,
): string => {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }
  if (contentType.includes("mp4")) {
    return "mp4";
  }
  if (contentType.includes("quicktime")) {
    return "mov";
  }
  return fallback;
};

const contentTypeFromUrl = (url: string, fallback: string): string => {
  const normalized = url.toLowerCase();
  if (normalized.includes(".png")) {
    return "image/png";
  }
  if (normalized.includes(".webp")) {
    return "image/webp";
  }
  if (normalized.includes(".jpg") || normalized.includes(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.includes(".mp4")) {
    return "video/mp4";
  }
  if (normalized.includes(".mov")) {
    return "video/quicktime";
  }
  return fallback;
};

const downloadRemoteAsset = async (input: {
  sourceUrl: string;
  fallbackContentType: string;
}): Promise<{ buffer: Buffer; contentType: string }> => {
  const response = await fetchWithRetry(
    input.sourceUrl,
    {
      method: "GET",
      signal: AbortSignal.timeout(REMOTE_DOWNLOAD_TIMEOUT_MS),
    },
    {
      maxAttempts: 3,
    },
  );
  const bytes = await response.arrayBuffer();
  const responseContentType = response.headers.get("content-type")?.trim();
  const contentType =
    responseContentType && responseContentType.length > 0
      ? responseContentType
      : contentTypeFromUrl(input.sourceUrl, input.fallbackContentType);
  return {
    buffer: Buffer.from(bytes),
    contentType,
  };
};

export const materializeRemoteImageAsset = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
  sourceUrl: string;
}): Promise<string> => {
  const downloaded = await downloadRemoteAsset({
    sourceUrl: input.sourceUrl,
    fallbackContentType: "image/jpeg",
  });
  const extension = extensionFromContentType(downloaded.contentType, "jpg");
  const imageS3Key = `assets/${input.jobId}/stock/images/scene-${input.sceneId}/${input.candidateId}.${extension}`;
  await putBufferToS3(imageS3Key, downloaded.buffer, downloaded.contentType);
  return imageS3Key;
};

export const materializeRemoteVideoAsset = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
  sourceUrl: string;
}): Promise<string> => {
  const downloaded = await downloadRemoteAsset({
    sourceUrl: input.sourceUrl,
    fallbackContentType: "video/mp4",
  });
  const extension = extensionFromContentType(downloaded.contentType, "mp4");
  const videoClipS3Key = `assets/${input.jobId}/stock/videos/scene-${input.sceneId}/${input.candidateId}.${extension}`;
  await putBufferToS3(
    videoClipS3Key,
    downloaded.buffer,
    downloaded.contentType,
  );
  return videoClipS3Key;
};
