import {
  getSceneVideoCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { mapSelectedVideoCandidatePatch } from "../mapper/map-selected-video-candidate-patch";
import { resolveSelectedVideoS3Key } from "../repo/resolve-selected-video-s3-key";

export const selectSceneVideoCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  const candidate = await getSceneVideoCandidate(
    input.jobId,
    input.sceneId,
    input.candidateId,
  );
  if (!candidate) {
    throw notFound("video candidate not found");
  }
  const videoClipS3Key = await resolveSelectedVideoS3Key({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
  });

  await upsertSceneAsset(input.jobId, input.sceneId, {
    ...mapSelectedVideoCandidatePatch(candidate, videoClipS3Key),
  });

  return getJobDraftView(input.jobId);
};
