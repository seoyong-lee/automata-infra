import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime-s3";
import { invokeSceneVideoTranscriptWorkerAsync } from "../../../../shared/lib/aws/invoke-scene-video-transcript-worker";
import type { SceneVideoTranscript } from "../../../../shared/lib/contracts/video-transcript";
import {
  getSceneAsset,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../../admin/shared/usecase/get-job-draft-view";
import { badUserInput, notFound } from "../../../../admin/shared/errors";
import { getJobOrThrow } from "../../../../admin/shared/repo/job-draft-store";

const TRANSCRIBE_SUPPORTED_VIDEO_EXTENSION_RE = /\.(mp4|webm)$/i;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return "failed to enqueue scene video transcript";
};

const buildQueuedTranscript = (input: {
  s3Key: string;
  updatedAt: string;
}): SceneVideoTranscript => ({
  status: "QUEUED",
  provider: "AWS_TRANSCRIBE",
  sourceS3Key: input.s3Key,
  updatedAt: input.updatedAt,
});

const assertSceneVideoKeyMatches = (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  const expectedPrefix = `assets/${input.jobId}/manual/video/scene-${input.sceneId}/`;
  if (!input.s3Key.startsWith(expectedPrefix)) {
    throw badUserInput(
      "s3Key must point to an uploaded scene video for the selected job and scene",
    );
  }
  if (!TRANSCRIBE_SUPPORTED_VIDEO_EXTENSION_RE.test(input.s3Key)) {
    throw badUserInput(
      "scene video transcript currently supports only .mp4 and .webm uploads",
    );
  }
};

export const completeSceneVideoUpload = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  await getJobOrThrow(input.jobId);
  const existingSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!existingSceneAsset) {
    throw notFound("scene asset not found");
  }

  assertSceneVideoKeyMatches(input);
  const objectHead = await headObjectFromS3(input.s3Key);
  if (!objectHead.exists) {
    throw badUserInput("uploaded scene video not found");
  }
  if (!objectHead.contentType?.toLowerCase().startsWith("video/")) {
    throw badUserInput("s3Key must point to a video/* object");
  }

  const queuedAt = new Date().toISOString();
  const queuedTranscript = buildQueuedTranscript({
    s3Key: input.s3Key,
    updatedAt: queuedAt,
  });

  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoClipS3Key: input.s3Key,
    videoSelectedCandidateId: null,
    videoTranscript: queuedTranscript,
  });

  try {
    await invokeSceneVideoTranscriptWorkerAsync({
      kind: "S3_UPLOAD",
      ...input,
    });
    console.info(
      JSON.stringify({
        scope: "scene-video-transcript",
        action: "queued",
        jobId: input.jobId,
        sceneId: input.sceneId,
        s3Key: input.s3Key,
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
        action: "queue_failed",
        jobId: input.jobId,
        sceneId: input.sceneId,
        s3Key: input.s3Key,
        error: toErrorMessage(error),
      }),
    );
    throw error;
  }

  return getJobDraftView(input.jobId);
};
