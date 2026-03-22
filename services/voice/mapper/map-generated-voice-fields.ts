/**
 * 음성 생성기 응답을 scene row에 merge할 필드로만 정제한다.
 */
export const mapGeneratedVoiceFields = (
  raw: Record<string, unknown>,
  sceneId: number,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { sceneId };

  if (typeof raw.voiceS3Key === "string" && raw.voiceS3Key.length > 0) {
    out.voiceS3Key = raw.voiceS3Key;
  }
  if (typeof raw.provider === "string") {
    out.voiceProvider = raw.provider;
  }
  if (typeof raw.providerLogS3Key === "string") {
    out.voiceProviderLogS3Key = raw.providerLogS3Key;
  }
  if (typeof raw.mocked === "boolean") {
    out.voiceMocked = raw.mocked;
  }
  if (typeof raw.durationSec === "number" && Number.isFinite(raw.durationSec)) {
    out.voiceDurationSec = raw.durationSec;
  }
  if (typeof raw.voiceProfileId === "string" && raw.voiceProfileId.length > 0) {
    out.voiceProfileId = raw.voiceProfileId;
  }

  return out;
};
