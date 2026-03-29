import {
  getSceneImageCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { mapSelectedImageCandidatePatch } from "../mapper/map-selected-image-candidate-patch";
import { resolveSelectedImageS3Key } from "../repo/resolve-selected-image-s3-key";

export const selectSceneImageCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  const candidate = await getSceneImageCandidate(
    input.jobId,
    input.sceneId,
    input.candidateId,
  );
  if (!candidate) {
    throw notFound("image candidate not found");
  }
  const imageS3Key = await resolveSelectedImageS3Key({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
  });

  await upsertSceneAsset(input.jobId, input.sceneId, {
    ...mapSelectedImageCandidatePatch(candidate, imageS3Key),
  });

  return getJobDraftView(input.jobId);
};
