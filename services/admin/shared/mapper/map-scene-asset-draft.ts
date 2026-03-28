import type {
  SceneImageCandidateItem,
  SceneVideoCandidateItem,
  SceneVoiceCandidateItem,
  SceneAssetItem,
} from "../../../shared/lib/store/video-jobs";
import { alignSceneNarrationAndSubtitle } from "../../../shared/lib/scene-text";

const asSelected = (input: {
  selectedCandidateId?: string;
  candidateId: string;
  candidateAssetKey: string;
  sceneAssetKey?: string;
}): boolean => {
  return input.selectedCandidateId !== undefined
    ? input.candidateId === input.selectedCandidateId
    : input.candidateAssetKey === input.sceneAssetKey;
};

export const mapSceneAssetDraft = (asset: SceneAssetItem) => {
  const alignedAsset = alignSceneNarrationAndSubtitle(asset);
  return {
    sceneId: alignedAsset.sceneId,
    imageS3Key: alignedAsset.imageS3Key,
    videoClipS3Key: alignedAsset.videoClipS3Key,
    voiceS3Key: alignedAsset.voiceS3Key,
    stockImageSearchStatus:
      typeof alignedAsset.stockImageSearchStatus === "string"
        ? alignedAsset.stockImageSearchStatus
        : undefined,
    stockImageSearchQuery:
      typeof alignedAsset.stockImageSearchQuery === "string"
        ? alignedAsset.stockImageSearchQuery
        : undefined,
    stockVideoSearchStatus:
      typeof alignedAsset.stockVideoSearchStatus === "string"
        ? alignedAsset.stockVideoSearchStatus
        : undefined,
    stockVideoSearchQuery:
      typeof alignedAsset.stockVideoSearchQuery === "string"
        ? alignedAsset.stockVideoSearchQuery
        : undefined,
    imageSelectedCandidateId:
      typeof alignedAsset.imageSelectedCandidateId === "string"
        ? alignedAsset.imageSelectedCandidateId
        : undefined,
    videoSelectedCandidateId:
      typeof alignedAsset.videoSelectedCandidateId === "string"
        ? alignedAsset.videoSelectedCandidateId
        : undefined,
    voiceSelectedCandidateId:
      typeof alignedAsset.voiceSelectedCandidateId === "string"
        ? alignedAsset.voiceSelectedCandidateId
        : undefined,
    voiceProfileId:
      typeof alignedAsset.voiceProfileId === "string"
        ? alignedAsset.voiceProfileId
        : undefined,
    voiceDurationSec:
      typeof alignedAsset.voiceDurationSec === "number"
        ? alignedAsset.voiceDurationSec
        : undefined,
    durationSec: alignedAsset.durationSec,
    narration: alignedAsset.narration,
    subtitle: alignedAsset.subtitle,
    imagePrompt: alignedAsset.imagePrompt,
    videoPrompt: alignedAsset.videoPrompt,
    validationStatus: alignedAsset.validationStatus,
  };
};

export const mapSceneImageCandidateDraft = (
  candidate: SceneImageCandidateItem,
  input: {
    selectedCandidateId?: string;
    sceneImageS3Key?: string;
  },
) => ({
  candidateId: candidate.candidateId,
  imageS3Key: candidate.imageS3Key,
  provider: candidate.provider,
  providerLogS3Key: candidate.providerLogS3Key,
  promptHash: candidate.promptHash,
  mocked: candidate.mocked,
  sourceUrl: candidate.sourceUrl,
  thumbnailUrl: candidate.thumbnailUrl,
  authorName: candidate.authorName,
  sourceAssetId: candidate.sourceAssetId,
  width: candidate.width,
  height: candidate.height,
  createdAt: candidate.createdAt,
  selected: asSelected({
    selectedCandidateId: input.selectedCandidateId,
    candidateId: candidate.candidateId,
    candidateAssetKey: candidate.imageS3Key,
    sceneAssetKey: input.sceneImageS3Key,
  }),
});

export const mapSceneVideoCandidateDraft = (
  candidate: SceneVideoCandidateItem,
  input: {
    selectedCandidateId?: string;
    sceneVideoClipS3Key?: string;
  },
) => ({
  candidateId: candidate.candidateId,
  videoClipS3Key: candidate.videoClipS3Key,
  provider: candidate.provider,
  providerLogS3Key: candidate.providerLogS3Key,
  promptHash: candidate.promptHash,
  mocked: candidate.mocked,
  sourceUrl: candidate.sourceUrl,
  thumbnailUrl: candidate.thumbnailUrl,
  authorName: candidate.authorName,
  sourceAssetId: candidate.sourceAssetId,
  width: candidate.width,
  height: candidate.height,
  durationSec: candidate.durationSec,
  createdAt: candidate.createdAt,
  selected: asSelected({
    selectedCandidateId: input.selectedCandidateId,
    candidateId: candidate.candidateId,
    candidateAssetKey: candidate.videoClipS3Key,
    sceneAssetKey: input.sceneVideoClipS3Key,
  }),
});

export const mapSceneVoiceCandidateDraft = (
  candidate: SceneVoiceCandidateItem,
  input: {
    selectedCandidateId?: string;
    sceneVoiceS3Key?: string;
  },
) => ({
  candidateId: candidate.candidateId,
  voiceS3Key: candidate.voiceS3Key,
  provider: candidate.provider,
  providerLogS3Key: candidate.providerLogS3Key,
  mocked: candidate.mocked,
  voiceDurationSec: candidate.voiceDurationSec,
  voiceProfileId: candidate.voiceProfileId,
  createdAt: candidate.createdAt,
  selected: asSelected({
    selectedCandidateId: input.selectedCandidateId,
    candidateId: candidate.candidateId,
    candidateAssetKey: candidate.voiceS3Key,
    sceneAssetKey: input.sceneVoiceS3Key,
  }),
});
