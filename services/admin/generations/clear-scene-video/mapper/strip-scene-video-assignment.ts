/**
 * 씬 행에서 “선택된 영상” 및 관련 메타를 제거한다 (Dynamo Put 시 스프레드용).
 */
export const SCENE_VIDEO_ASSIGNMENT_KEYS = [
  "videoClipS3Key",
  "videoProvider",
  "videoProviderLogS3Key",
  "videoPromptHash",
  "videoMocked",
  "videoTargetDurationSec",
  "videoResolvedDurationSec",
  "videoAssetId",
  "videoSelectedCandidateId",
  "videoSelectedAt",
  "videoSelectionSource",
  "videoTranscript",
] as const;

export const stripSceneVideoAssignment = (
  asset: Record<string, unknown>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...asset };
  for (const key of SCENE_VIDEO_ASSIGNMENT_KEYS) {
    delete next[key];
  }
  return next;
};
