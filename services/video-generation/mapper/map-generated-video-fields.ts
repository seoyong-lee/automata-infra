/**
 * 영상 생성기 응답을 scene row에 merge할 필드로만 정제한다.
 * Runway 실제 키는 `videoClipS3Key`; 테스트 더블 등에서 `videoS3Key`만 올 수 있어 허용한다.
 */
const pickNonEmptyString = (
  raw: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

const pickFiniteNumber = (
  raw: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

export const mapGeneratedVideoFields = (
  raw: Record<string, unknown>,
  sceneId: number,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { sceneId };

  const clipKey = pickNonEmptyString(raw, "videoClipS3Key", "videoS3Key");
  if (clipKey) {
    out.videoClipS3Key = clipKey;
  }
  const provider = pickNonEmptyString(raw, "provider");
  if (provider) {
    out.videoProvider = provider;
  }
  const providerLogS3Key = pickNonEmptyString(raw, "providerLogS3Key");
  if (providerLogS3Key) {
    out.videoProviderLogS3Key = providerLogS3Key;
  }
  const promptHash = pickNonEmptyString(raw, "promptHash");
  if (promptHash) {
    out.videoPromptHash = promptHash;
  }
  if (typeof raw.mocked === "boolean") {
    out.videoMocked = raw.mocked;
  }
  const targetDurationSec = pickFiniteNumber(raw, "targetDurationSec");
  if (targetDurationSec !== undefined) {
    out.videoTargetDurationSec = targetDurationSec;
  }
  const resolvedDurationSec = pickFiniteNumber(raw, "resolvedDurationSec");
  if (resolvedDurationSec !== undefined) {
    out.videoResolvedDurationSec = resolvedDurationSec;
  }
  const candidateId = pickNonEmptyString(raw, "candidateId");
  if (candidateId) {
    out.videoSelectedCandidateId = candidateId;
  }
  const createdAt = pickNonEmptyString(raw, "createdAt");
  if (createdAt) {
    out.videoSelectedAt = createdAt;
  }

  return out;
};
