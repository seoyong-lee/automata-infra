import type { DiscoveryTabId } from './discovery-tabs';

export function buildDiscoveryHref(tab: DiscoveryTabId, channelId: string) {
  const p = new URLSearchParams();
  if (channelId) p.set('channel', channelId);
  p.set('tab', tab);
  const q = p.toString();
  return q ? `/discovery?${q}` : '/discovery';
}
