import type { SceneImageCandidateItem } from "../../../../shared/lib/store/video-jobs";

export const mapSelectedImageCandidatePatch = (
  candidate: SceneImageCandidateItem,
  imageS3Key: string,
) => {
  return {
    imageS3Key,
    imageProvider: candidate.provider,
    imageProviderLogS3Key: candidate.providerLogS3Key,
    imagePromptHash: candidate.promptHash,
    imageMocked: candidate.mocked,
    imageSelectedCandidateId: candidate.candidateId,
    imageSelectedAt: candidate.createdAt,
  };
};
