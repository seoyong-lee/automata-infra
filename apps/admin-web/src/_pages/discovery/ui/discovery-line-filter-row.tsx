'use client';

import Link from 'next/link';

import type { AdminContent } from '@/entities/admin-content';

type Props = {
  channelId: string;
  items: AdminContent[];
  isLoading: boolean;
  onChannelChange: (nextId: string) => void;
};

export function DiscoveryLineFilterRow({ channelId, items, isLoading, onChannelChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      <label
        htmlFor="discovery-channel"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <span>라인 필터</span>
        <select
          id="discovery-channel"
          className="h-8 min-w-48 rounded-md border border-border bg-background px-2 text-sm"
          value={channelId}
          onChange={(e) => onChannelChange(e.target.value)}
          disabled={isLoading}
        >
          <option value="">전체</option>
          {items.map((c) => (
            <option key={c.contentId} value={c.contentId}>
              {c.label || c.contentId}
            </option>
          ))}
        </select>
      </label>
      {channelId ? (
        <Link
          href={`/content/${encodeURIComponent(channelId)}/jobs`}
          className="text-sm text-primary hover:underline"
        >
          이 라인의 제작 아이템 →
        </Link>
      ) : null}
    </div>
  );
}
