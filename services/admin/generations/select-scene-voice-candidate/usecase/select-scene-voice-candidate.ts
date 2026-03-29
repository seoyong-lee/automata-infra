import {
  getSceneVoiceCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { mapSelectedVoiceCandidatePatch } from "../mapper/map-selected-voice-candidate-patch";

export const selectSceneVoiceCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  const candidate = await getSceneVoiceCandidate(
    input.jobId,
    input.sceneId,
    input.candidateId,
  );
  if (!candidate) {
    throw notFound("voice candidate not found");
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    ...mapSelectedVoiceCandidatePatch(candidate),
  });

  return getJobDraftView(input.jobId);
};
