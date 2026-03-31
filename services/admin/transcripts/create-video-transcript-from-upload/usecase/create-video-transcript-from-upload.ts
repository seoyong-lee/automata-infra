import { badUserInput, notFound } from "../../../../admin/shared/errors";
import { invokeStandaloneVideoTranscriptWorkerAsync } from "../../../../shared/lib/aws/invoke-standalone-video-transcript-worker";
import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime-s3";
import type { CreateVideoTranscriptFromUploadInput } from "../../../../shared/lib/contracts/standalone-video-transcript";
import {
  getStandaloneVideoTranscript,
  putStandaloneVideoTranscript,
} from "../../../../shared/lib/store/standalone-video-transcripts";

const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v)$/i;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return "failed to enqueue uploaded transcript";
};

const assertValidUploadedVideo = (input: {
  transcriptId: string;
  s3Key: string;
  contentType?: string;
}) => {
  if (
    !input.s3Key.startsWith(`assets/transcripts/${input.transcriptId}/source/`)
  ) {
    throw badUserInput("s3Key must point to this transcript upload path");
  }
  if (!VIDEO_EXTENSION_RE.test(input.s3Key)) {
    throw badUserInput("s3Key must reference a supported video file");
  }
  if (
    input.contentType &&
    !input.contentType.toLowerCase().startsWith("video/")
  ) {
    throw badUserInput("uploaded file must be a video asset");
  }
};

export const createVideoTranscriptFromUpload = async (
  input: CreateVideoTranscriptFromUploadInput,
) => {
  const existing = await getStandaloneVideoTranscript(input.transcriptId);
  if (!existing) {
    throw notFound("transcript not found");
  }
  if (existing.sourceType !== "UPLOAD") {
    throw badUserInput("transcriptId does not reference an upload transcript");
  }
  if (existing.sourceS3Key !== input.s3Key) {
    throw badUserInput("s3Key must match the requested transcript upload");
  }
  if (existing.status !== "AWAITING_UPLOAD" && existing.status !== "FAILED") {
    return existing;
  }

  const uploadedObject = await headObjectFromS3(input.s3Key);
  if (!uploadedObject.exists) {
    throw badUserInput("uploaded transcript video not found");
  }

  assertValidUploadedVideo({
    transcriptId: input.transcriptId,
    s3Key: input.s3Key,
    contentType: uploadedObject.contentType ?? existing.contentType,
  });

  const queuedAt = new Date().toISOString();
  const queuedRecord = {
    ...existing,
    status: "QUEUED" as const,
    provider: "AWS_TRANSCRIBE" as const,
    sourceS3Key: input.s3Key,
    languageCode: input.languageCode ?? existing.languageCode,
    contentType: uploadedObject.contentType ?? existing.contentType,
    markdown: undefined,
    plainTextPreview: undefined,
    providerJobId: undefined,
    startedAt: undefined,
    completedAt: undefined,
    updatedAt: queuedAt,
    lastError: undefined,
  };

  await putStandaloneVideoTranscript(queuedRecord);

  try {
    await invokeStandaloneVideoTranscriptWorkerAsync({
      kind: "UPLOAD_S3",
      transcriptId: input.transcriptId,
      s3Key: input.s3Key,
      preferredLanguage: queuedRecord.languageCode,
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
