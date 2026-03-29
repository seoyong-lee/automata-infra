import { getSceneVoiceCandidate } from "../../../../shared/lib/store/video-jobs";
import { applySceneCandidateSelection } from "../../shared/usecase/apply-scene-candidate-selection";
import { mapSelectedVoiceCandidatePatch } from "../mapper/map-selected-voice-candidate-patch";

export const selectSceneVoiceCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  return applySceneCandidateSelection({
    ...input,
    notFoundMessage: "voice candidate not found",
    loadCandidate: ({ jobId, sceneId, candidateId }) =>
      getSceneVoiceCandidate(jobId, sceneId, candidateId),
    buildPatch: async (candidate) => mapSelectedVoiceCandidatePatch(candidate),
  });
};
