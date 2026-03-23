/**
 * 영상 생성기 응답을 scene row에 merge할 필드로만 정제한다.
 * Runway 실제 키는 `videoClipS3Key`; 테스트 더블 등에서 `videoS3Key`만 올 수 있어 허용한다.
 */
export const mapGeneratedVideoFields = (
  raw: Record<string, unknown>,
  sceneId: number,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { sceneId };

  const clipKey =
    typeof raw.videoClipS3Key === "string" && raw.videoClipS3Key.length > 0
      ? raw.videoClipS3Key
      : typeof raw.videoS3Key === "string" && raw.videoS3Key.length > 0
        ? raw.videoS3Key
        : undefined;
  if (clipKey) {
    out.videoClipS3Key = clipKey;
  }
  if (typeof raw.provider === "string") {
    out.videoProvider = raw.provider;
  }
  if (typeof raw.providerLogS3Key === "string") {
    out.videoProviderLogS3Key = raw.providerLogS3Key;
  }
  if (typeof raw.promptHash === "string") {
    out.videoPromptHash = raw.promptHash;
  }
  if (typeof raw.mocked === "boolean") {
    out.videoMocked = raw.mocked;
  }
  if (
    typeof raw.targetDurationSec === "number" &&
    Number.isFinite(raw.targetDurationSec)
  ) {
    out.videoTargetDurationSec = raw.targetDurationSec;
  }
  if (
    typeof raw.resolvedDurationSec === "number" &&
    Number.isFinite(raw.resolvedDurationSec)
  ) {
    out.videoResolvedDurationSec = raw.resolvedDurationSec;
  }

  return out;
};
