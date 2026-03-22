/**
 * 이미지 생성기 응답을 scene row에 merge할 필드로만 정제한다.
 * 공통 키(provider, providerLogS3Key, …)는 image* 네임스페이스로 분리해 다른 모달리티와 덮어쓰지 않는다.
 */
export const mapGeneratedImageFields = (
  raw: Record<string, unknown>,
  sceneId: number,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { sceneId };

  if (typeof raw.imageS3Key === "string" && raw.imageS3Key.length > 0) {
    out.imageS3Key = raw.imageS3Key;
  }
  if (typeof raw.provider === "string") {
    out.imageProvider = raw.provider;
  }
  if (typeof raw.providerLogS3Key === "string") {
    out.imageProviderLogS3Key = raw.providerLogS3Key;
  }
  if (typeof raw.promptHash === "string") {
    out.imagePromptHash = raw.promptHash;
  }
  if (typeof raw.mocked === "boolean") {
    out.imageMocked = raw.mocked;
  }
  if (typeof raw.candidateId === "string") {
    out.imageSelectedCandidateId = raw.candidateId;
  }
  if (typeof raw.createdAt === "string") {
    out.imageSelectedAt = raw.createdAt;
  }

  return out;
};
