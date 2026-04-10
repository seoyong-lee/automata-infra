import {
  getSceneAsset,
  putSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { notFound } from "../../../shared/errors";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { ClearSceneVideoInput } from "../../../../shared/lib/contracts/clear-scene-video";
import { stripSceneVideoAssignment } from "../mapper/strip-scene-video-assignment";
import { maybeDeleteSceneVideoS3Objects } from "../repo/maybe-delete-scene-video-objects";

export const clearSceneVideo = async (input: ClearSceneVideoInput) => {
  await getJobOrThrow(input.jobId);
  const current = await getSceneAsset(input.jobId, input.sceneId);
  if (!current) {
    throw notFound("scene asset not found");
  }

  const clipKey =
    typeof current.videoClipS3Key === "string"
      ? current.videoClipS3Key
      : undefined;
  const logKey =
    typeof current.videoProviderLogS3Key === "string"
      ? current.videoProviderLogS3Key
      : undefined;

  const hasVideo =
    Boolean(clipKey) ||
    typeof current.videoSelectedCandidateId === "string" ||
    current.videoTranscript !== undefined;

  if (!hasVideo) {
    return getJobDraftView(input.jobId);
  }

  await maybeDeleteSceneVideoS3Objects({
    jobId: input.jobId,
    videoClipS3Key: clipKey,
    videoProviderLogS3Key: logKey,
  });

  const cleaned = stripSceneVideoAssignment(current as Record<string, unknown>);
  await putSceneAsset(input.jobId, input.sceneId, cleaned);

  return getJobDraftView(input.jobId);
};
