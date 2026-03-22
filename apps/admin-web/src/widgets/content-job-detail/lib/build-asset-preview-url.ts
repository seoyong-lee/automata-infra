/**
 * CloudFront(S3 OAC) 미리보기 도메인으로 에셋 URL을 만든다.
 * `services/shared/lib/providers/media/shotstack-mapper.ts` 의 `buildAssetUrl` 과 동일한 규칙.
 *
 * 로컬/배포 시 `NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN` 설정 필요(배포 스택의 Preview distribution 도메인).
 */
export function buildAssetPreviewUrlFromS3Key(
  s3Key: string | null | undefined,
): string | undefined {
  if (typeof s3Key !== 'string' || s3Key.trim().length === 0) {
    return undefined;
  }
  const raw = process.env.NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN?.trim();
  if (!raw) {
    return undefined;
  }
  const domain = raw.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const path = s3Key.replace(/^\/+/, '');
  return `https://${domain}/${path}`;
}
