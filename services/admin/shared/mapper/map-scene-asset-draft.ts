import type {
  SceneImageCandidateItem,
  SceneVideoCandidateItem,
  SceneVoiceCandidateItem,
  SceneAssetItem,
} from "../../../shared/lib/store/video-jobs";
import type { SceneVisualNeed } from "../../../shared/lib/contracts/canonical-io-schemas";
import { parseSceneVideoTranscript } from "../../../shared/lib/contracts/video-transcript";
import { alignSceneNarrationAndSubtitle } from "../../../shared/lib/scene-text";

const asOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const asOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === "number" ? value : undefined;
};

const asOptionalVisualNeed = (value: unknown): SceneVisualNeed | undefined => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SceneVisualNeed)
    : undefined;
};

const asOptionalVideoTranscript = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  try {
    return parseSceneVideoTranscript(value);
  } catch {
    return undefined;
  }
};

const asSelected = (input: {
  selectedCandidateId?: string;
  candidateId: string;
  candidateAssetKey?: string;
  sceneAssetKey?: string;
}): boolean => {
  if (input.selectedCandidateId !== undefined) {
    return input.candidateId === input.selectedCandidateId;
  }
  if (!input.candidateAssetKey || !input.sceneAssetKey) {
    return false;
  }
  return input.candidateAssetKey === input.sceneAssetKey;
};

export const mapSceneAssetDraft = (asset: SceneAssetItem) => {
  const alignedAsset = alignSceneNarrationAndSubtitle(asset);
  return {
    sceneId: alignedAsset.sceneId,
    imageS3Key: alignedAsset.imageS3Key,
    videoClipS3Key: alignedAsset.videoClipS3Key,
    voiceS3Key: alignedAsset.voiceS3Key,
    videoTranscript: asOptionalVideoTranscript(alignedAsset.videoTranscript),
    stockImageSearchStatus: asOptionalString(
      alignedAsset.stockImageSearchStatus,
    ),
    stockImageSearchQuery: asOptionalString(alignedAsset.stockImageSearchQuery),
    stockVideoSearchStatus: asOptionalString(
      alignedAsset.stockVideoSearchStatus,
    ),
    stockVideoSearchQuery: asOptionalString(alignedAsset.stockVideoSearchQuery),
    imageSelectedCandidateId: asOptionalString(
      alignedAsset.imageSelectedCandidateId,
    ),
    videoSelectedCandidateId: asOptionalString(
      alignedAsset.videoSelectedCandidateId,
    ),
    videoSelectedAt: asOptionalString(alignedAsset.videoSelectedAt),
    voiceSelectedCandidateId: asOptionalString(
      alignedAsset.voiceSelectedCandidateId,
    ),
    voiceProfileId: asOptionalString(alignedAsset.voiceProfileId),
    voiceDurationSec: asOptionalNumber(alignedAsset.voiceDurationSec),
    durationSec: alignedAsset.durationSec,
    narration: alignedAsset.narration,
    subtitle: alignedAsset.subtitle,
    storyBeat: asOptionalString(alignedAsset.storyBeat),
    visualNeed: asOptionalVisualNeed(alignedAsset.visualNeed),
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
  candidateSource: candidate.candidateSource,
  assetPoolAssetId: candidate.assetPoolAssetId,
  matchScore: candidate.matchScore,
  provider: candidate.provider,
  providerLogS3Key: candidate.providerLogS3Key,
  promptHash: candidate.promptHash,
  mocked: candidate.mocked,
  sourceUrl: candidate.sourceUrl,
  thumbnailUrl: candidate.thumbnailUrl,
  authorName: candidate.authorName,
  sourceAssetId: candidate.sourceAssetId,
  licenseType: candidate.licenseType,
  attributionRequired: candidate.attributionRequired,
  commercialUseAllowed: candidate.commercialUseAllowed,
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
  candidateSource: candidate.candidateSource,
  assetPoolAssetId: candidate.assetPoolAssetId,
  matchScore: candidate.matchScore,
  provider: candidate.provider,
  providerLogS3Key: candidate.providerLogS3Key,
  promptHash: candidate.promptHash,
  mocked: candidate.mocked,
  sourceUrl: candidate.sourceUrl,
  thumbnailUrl: candidate.thumbnailUrl,
  authorName: candidate.authorName,
  sourceAssetId: candidate.sourceAssetId,
  licenseType: candidate.licenseType,
  attributionRequired: candidate.attributionRequired,
  commercialUseAllowed: candidate.commercialUseAllowed,
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
