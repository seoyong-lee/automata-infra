import { getSceneImageCandidate } from "../../../../shared/lib/store/video-jobs";
import { applySceneCandidateSelection } from "../../shared/usecase/apply-scene-candidate-selection";
import { mapSelectedImageCandidatePatch } from "../mapper/map-selected-image-candidate-patch";
import { resolveSelectedImageS3Key } from "../repo/resolve-selected-image-s3-key";

export const selectSceneImageCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  return applySceneCandidateSelection({
    ...input,
    notFoundMessage: "image candidate not found",
    loadCandidate: ({ jobId, sceneId, candidateId }) =>
      getSceneImageCandidate(jobId, sceneId, candidateId),
    buildPatch: async (candidate) => {
      const imageS3Key = await resolveSelectedImageS3Key({
        jobId: input.jobId,
        sceneId: input.sceneId,
        candidate,
      });
      return mapSelectedImageCandidatePatch(candidate, imageS3Key);
    },
  });
};
