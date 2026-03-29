import type { SceneVideoCandidateItem } from "../../../../shared/lib/store/video-jobs";

export const mapSelectedVideoCandidatePatch = (
  candidate: SceneVideoCandidateItem,
  videoClipS3Key: string,
) => {
  return {
    videoClipS3Key,
    videoProvider: candidate.provider,
    videoProviderLogS3Key: candidate.providerLogS3Key,
    videoPromptHash: candidate.promptHash,
    videoMocked: candidate.mocked,
    videoSelectedCandidateId: candidate.candidateId,
    videoSelectedAt: candidate.createdAt,
    ...(typeof candidate.durationSec === "number"
      ? { videoResolvedDurationSec: candidate.durationSec }
      : {}),
  };
};
