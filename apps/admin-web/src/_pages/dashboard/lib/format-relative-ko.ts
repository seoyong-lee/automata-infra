/** 짧은 상대 시각(대시보드 리스트용). */
export function formatRelative(iso: string, locale: 'ko' | 'en' = 'ko'): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const diffSec = Math.floor((Date.now() - d) / 1000);
  if (diffSec < 45) return locale === 'ko' ? '방금' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return locale === 'ko' ? `${diffMin}분 전` : `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return locale === 'ko' ? `${diffH}시간 전` : `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return locale === 'ko' ? `${diffD}일 전` : `${diffD}d ago`;
}

export function formatRelativeKo(iso: string): string {
  return formatRelative(iso, 'ko');
}
