import { getSceneVideoCandidate } from "../../../../shared/lib/store/video-jobs";
import { applySceneCandidateSelection } from "../../shared/usecase/apply-scene-candidate-selection";
import { mapSelectedVideoCandidatePatch } from "../mapper/map-selected-video-candidate-patch";
import { resolveSelectedVideoS3Key } from "../repo/resolve-selected-video-s3-key";

export const selectSceneVideoCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  return applySceneCandidateSelection({
    ...input,
    notFoundMessage: "video candidate not found",
    loadCandidate: ({ jobId, sceneId, candidateId }) =>
      getSceneVideoCandidate(jobId, sceneId, candidateId),
    buildPatch: async (candidate) => {
      const videoClipS3Key = await resolveSelectedVideoS3Key({
        jobId: input.jobId,
        sceneId: input.sceneId,
        candidate,
      });
      return mapSelectedVideoCandidatePatch(candidate, videoClipS3Key);
    },
  });
};
