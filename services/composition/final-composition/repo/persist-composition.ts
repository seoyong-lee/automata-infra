import { putBufferToS3 } from "../../../shared/lib/aws/runtime";
import {
  fetchArrayBufferWithRetry,
  fetchWithRetry,
} from "../../../shared/lib/providers/http/retry";
import {
  putRenderArtifact,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";

type CompositionResult = {
  finalVideoS3Key: string;
  thumbnailS3Key: string;
  previewS3Key: string;
  provider: string;
  providerRenderId?: string | null;
  sourceVideoUrl?: string;
  sourceThumbnailUrl?: string;
  artifactsStored?: boolean;
};

const toBuffer = (arrayBuffer: ArrayBuffer): Buffer => {
  return Buffer.from(arrayBuffer);
};

const storePlaceholderArtifacts = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await putBufferToS3(
    composition.finalVideoS3Key,
    `final video placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.thumbnailS3Key,
    `thumbnail placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.previewS3Key,
    `preview placeholder for ${jobId}`,
    "text/plain",
  );
};

const storeRenderedArtifacts = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  if (composition.artifactsStored) {
    return;
  }
  if (!composition.sourceVideoUrl) {
    await storePlaceholderArtifacts(jobId, composition);
    return;
  }

  const finalVideo = await fetchArrayBufferWithRetry(
    composition.sourceVideoUrl,
    {
      method: "GET",
    },
  );
  const finalVideoBuffer = toBuffer(finalVideo);
  await putBufferToS3(
    composition.finalVideoS3Key,
    finalVideoBuffer,
    "video/mp4",
  );
  await putBufferToS3(composition.previewS3Key, finalVideoBuffer, "video/mp4");

  if (!composition.sourceThumbnailUrl) {
    await putBufferToS3(
      composition.thumbnailS3Key,
      `thumbnail unavailable for ${jobId}`,
      "text/plain",
    );
    return;
  }

  const thumbnailResponse = await fetchWithRetry(
    composition.sourceThumbnailUrl,
    {
      method: "GET",
    },
  );
  const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
  const thumbnailContentType =
    thumbnailResponse.headers.get("content-type") ?? "image/jpeg";
  await putBufferToS3(
    composition.thumbnailS3Key,
    thumbnailBuffer,
    thumbnailContentType,
  );
};

export const persistComposition = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await storeRenderedArtifacts(jobId, composition);

  await putRenderArtifact(jobId, {
    finalVideoS3Key: composition.finalVideoS3Key,
    thumbnailS3Key: composition.thumbnailS3Key,
    previewS3Key: composition.previewS3Key,
    provider: composition.provider,
    providerRenderId: composition.providerRenderId ?? null,
    createdAt: new Date().toISOString(),
  });

  await updateJobMeta(
    jobId,
    {
      finalVideoS3Key: composition.finalVideoS3Key,
      thumbnailS3Key: composition.thumbnailS3Key,
      previewS3Key: composition.previewS3Key,
    },
    "RENDERED",
  );
};
