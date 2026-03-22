import {
  getSceneVoiceCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../shared/errors";
import { getJobDraft } from "../../get-job-draft/repo/get-job-draft";

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
    voiceS3Key: candidate.voiceS3Key,
    voiceProvider: candidate.provider,
    voiceProviderLogS3Key: candidate.providerLogS3Key,
    voiceMocked: candidate.mocked,
    voiceDurationSec: candidate.voiceDurationSec,
    voiceProfileId: candidate.voiceProfileId,
    voiceSelectedCandidateId: candidate.candidateId,
    voiceSelectedAt: candidate.createdAt,
  });

  return getJobDraft(input.jobId);
};
