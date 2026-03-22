export const DISCOVERY_TAB_IDS = ['explore', 'shortlist', 'saved'] as const;
export type DiscoveryTabId = (typeof DISCOVERY_TAB_IDS)[number];

/** 구 URL(tab=watchlist 등) → 신 탭 id */
export function normalizeDiscoveryTab(raw: string | null): DiscoveryTabId {
  if (!raw) return 'explore';
  if ((DISCOVERY_TAB_IDS as readonly string[]).includes(raw)) {
    return raw as DiscoveryTabId;
  }
  const legacy: Record<string, DiscoveryTabId> = {
    sources: 'saved',
    watchlist: 'shortlist',
    candidates: 'shortlist',
    trends: 'explore',
  };
  return legacy[raw] ?? 'explore';
}

export const DISCOVERY_TAB_LABELS: Record<DiscoveryTabId, string> = {
  explore: '탐색',
  shortlist: '후보',
  saved: '저장한 아이디어',
};
