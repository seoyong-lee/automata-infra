import type { AdminContent, AdminJob, SourceItemGql } from '@packages/graphql';

import type { MergedRow } from '../types';

export function countJobsBySourceItem(jobs: AdminJob[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const j of jobs) {
    const sid = j.sourceItemId;
    if (sid) m[sid] = (m[sid] ?? 0) + 1;
  }
  return m;
}

export function resolveChannelIdsForFilter(
  catalog: AdminContent[],
  channelFilter: string,
): string[] {
  const ids = catalog.map((c) => c.contentId).filter(Boolean);
  const f = channelFilter.trim();
  if (f) return ids.filter((id) => id === f);
  return ids;
}

export function channelLabelMap(catalog: AdminContent[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of catalog) {
    m[c.contentId] = c.label || c.contentId;
  }
  return m;
}

export function mergeRowsFromQueries(
  channelIds: string[],
  sourceLists: SourceItemGql[][],
  labelById: Record<string, string>,
): MergedRow[] {
  const rows: MergedRow[] = [];
  for (let i = 0; i < channelIds.length; i++) {
    const channelId = channelIds[i];
    const list = sourceLists[i] ?? [];
    const channelLabel = labelById[channelId] ?? channelId;
    for (const source of list) {
      rows.push({ channelId, channelLabel, source });
    }
  }
  return rows.sort(
    (a, b) =>
      new Date(b.source.updatedAt).getTime() - new Date(a.source.updatedAt).getTime(),
  );
}

export function filterMergedRows(
  merged: MergedRow[],
  search: string,
  statusFilter: string,
): MergedRow[] {
  const q = search.trim().toLowerCase();
  return merged.filter((row) => {
    if (
      statusFilter &&
      row.source.status !== (statusFilter as SourceItemGql['status'])
    ) {
      return false;
    }
    if (!q) return true;
    const s = row.source;
    const hay = [s.topic, s.masterHook ?? '', s.sourceNotes ?? ''].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
