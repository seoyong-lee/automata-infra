import { randomUUID } from "crypto";

import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime-s3";
import { invokeSceneVideoTranscriptWorkerAsync } from "../../../../shared/lib/aws/invoke-scene-video-transcript-worker";
import type { SceneVideoTranscript } from "../../../../shared/lib/contracts/video-transcript";
import {
  getSceneAsset,
  putSceneVideoCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../../admin/shared/usecase/get-job-draft-view";
import { badUserInput, notFound } from "../../../../admin/shared/errors";
import { getJobOrThrow } from "../../../../admin/shared/repo/job-draft-store";

/** `requestAssetUpload` SCENE_VIDEO와 동일 (Transcribe는 mov/m4v를 mp4 계열로 처리). */
const SCENE_MANUAL_VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v)$/i;

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
  if (!SCENE_MANUAL_VIDEO_EXTENSION_RE.test(input.s3Key)) {
    throw badUserInput(
      "scene video must be .mp4, .mov, .webm, or .m4v (same as requestAssetUpload SCENE_VIDEO)",
    );
  }
};

const assertUploadedSceneVideoHead = async (s3Key: string): Promise<void> => {
  const objectHead = await headObjectFromS3(s3Key);
  if (!objectHead.exists) {
    throw badUserInput("uploaded scene video not found");
  }
  if (!objectHead.contentType?.toLowerCase().startsWith("video/")) {
    throw badUserInput("s3Key must point to a video/* object");
  }
};

const persistManualSceneVideoAndCandidate = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
  queuedAt: string;
  queuedTranscript: SceneVideoTranscript;
}): Promise<void> => {
  const manualCandidateId = randomUUID();
  await putSceneVideoCandidate(input.jobId, input.sceneId, manualCandidateId, {
    videoClipS3Key: input.s3Key,
    createdAt: input.queuedAt,
    candidateSource: "manual",
  });
  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoClipS3Key: input.s3Key,
    videoSelectedCandidateId: manualCandidateId,
    videoSelectedAt: input.queuedAt,
    videoSelectionSource: "manual",
    videoTranscript: input.queuedTranscript,
  });
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
  await assertUploadedSceneVideoHead(input.s3Key);

  const queuedAt = new Date().toISOString();
  const queuedTranscript = buildQueuedTranscript({
    s3Key: input.s3Key,
    updatedAt: queuedAt,
  });

  await persistManualSceneVideoAndCandidate({
    jobId: input.jobId,
    sceneId: input.sceneId,
    s3Key: input.s3Key,
    queuedAt,
    queuedTranscript,
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
