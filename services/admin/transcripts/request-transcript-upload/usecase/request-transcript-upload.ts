import { randomUUID } from "crypto";

import { badUserInput } from "../../../../admin/shared/errors";
import { createSignedUploadUrlForS3 } from "../../../../shared/lib/aws/runtime-s3";
import type { RequestTranscriptUploadInput } from "../../../../shared/lib/contracts/standalone-video-transcript";
import {
  buildStandaloneTranscriptUploadSourceKey,
  putStandaloneVideoTranscript,
} from "../../../../shared/lib/store/standalone-video-transcripts";

const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v)$/i;

const buildTranscriptId = (): string => {
  return `transcript_${randomUUID().replace(/-/g, "")}`;
};

const assertValidUpload = (input: RequestTranscriptUploadInput) => {
  if (!input.contentType.toLowerCase().startsWith("video/")) {
    throw badUserInput("contentType must be video/*");
  }
  if (!VIDEO_EXTENSION_RE.test(input.fileName)) {
    throw badUserInput("transcript upload must be .mp4, .mov, .webm, or .m4v");
  }
};

export const requestTranscriptUpload = async (
  input: RequestTranscriptUploadInput,
): Promise<{
  transcriptId: string;
  uploadUrl: string;
  s3Key: string;
  fileName: string;
  contentType: string;
}> => {
  assertValidUpload(input);

  const transcriptId = buildTranscriptId();
  const s3Key = buildStandaloneTranscriptUploadSourceKey({
    transcriptId,
    fileName: input.fileName,
  });
  const now = new Date().toISOString();

  await putStandaloneVideoTranscript({
    transcriptId,
    status: "AWAITING_UPLOAD",
    sourceType: "UPLOAD",
    provider: "AWS_TRANSCRIBE",
    sourceS3Key: s3Key,
    fileName: input.fileName,
    contentType: input.contentType,
    createdAt: now,
    updatedAt: now,
  });

  const uploadUrl = await createSignedUploadUrlForS3({
    key: s3Key,
    contentType: input.contentType,
  });

  return {
    transcriptId,
    uploadUrl,
    s3Key,
    fileName: s3Key.split("/").pop() ?? input.fileName,
    contentType: input.contentType,
  };
};
