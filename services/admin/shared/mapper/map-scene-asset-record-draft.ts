import {
  mapSceneAssetDraft,
  mapSceneImageCandidateDraft,
  mapSceneVideoCandidateDraft,
  mapSceneVoiceCandidateDraft,
} from "./map-scene-asset-draft";
import type { SceneAssetDto } from "../types";
import type { StoredSceneAssetRecord } from "../repo/job-draft-store";

export const mapSceneAssetRecordDraft = (
  record: StoredSceneAssetRecord,
): SceneAssetDto => {
  const selectedImageCandidateId =
    typeof record.asset.imageSelectedCandidateId === "string"
      ? record.asset.imageSelectedCandidateId
      : undefined;
  const selectedVideoCandidateId =
    typeof record.asset.videoSelectedCandidateId === "string"
      ? record.asset.videoSelectedCandidateId
      : undefined;
  const selectedVoiceCandidateId =
    typeof record.asset.voiceSelectedCandidateId === "string"
      ? record.asset.voiceSelectedCandidateId
      : undefined;

  return {
    ...mapSceneAssetDraft(record.asset),
    imageCandidates: record.imageCandidates.map((candidate) =>
      mapSceneImageCandidateDraft(candidate, {
        selectedCandidateId: selectedImageCandidateId,
        sceneImageS3Key: record.asset.imageS3Key,
      }),
    ),
    videoCandidates: record.videoCandidates.map((candidate) =>
      mapSceneVideoCandidateDraft(candidate, {
        selectedCandidateId: selectedVideoCandidateId,
        sceneVideoClipS3Key: record.asset.videoClipS3Key,
      }),
    ),
    voiceCandidates: record.voiceCandidates.map((candidate) =>
      mapSceneVoiceCandidateDraft(candidate, {
        selectedCandidateId: selectedVoiceCandidateId,
        sceneVoiceS3Key: record.asset.voiceS3Key,
      }),
    ),
  };
};
