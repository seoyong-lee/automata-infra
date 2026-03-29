import type { SceneVoiceCandidateItem } from "../../../../shared/lib/store/video-jobs";

export const mapSelectedVoiceCandidatePatch = (
  candidate: SceneVoiceCandidateItem,
) => {
  return {
    voiceS3Key: candidate.voiceS3Key,
    voiceProvider: candidate.provider,
    voiceProviderLogS3Key: candidate.providerLogS3Key,
    voiceMocked: candidate.mocked,
    voiceDurationSec: candidate.voiceDurationSec,
    voiceProfileId: candidate.voiceProfileId,
    voiceSelectedCandidateId: candidate.candidateId,
    voiceSelectedAt: candidate.createdAt,
  };
};
