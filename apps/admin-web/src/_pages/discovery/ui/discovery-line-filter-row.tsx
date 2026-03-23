'use client';

import { ArrowUpRight, Layers3 } from 'lucide-react';
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
    <div className="rounded-xl border border-admin-outline-ghost/15 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-admin-primary">
            <Layers3 className="size-4" />
            라인 필터
          </div>
          <p className="text-sm text-admin-text-muted">
            운영 라인을 선택하면 관심 채널과 추천 후보가 해당 스코프로 좁혀집니다.
          </p>
        </div>
        <label
          htmlFor="discovery-channel"
          className="flex flex-col gap-2 text-xs text-admin-text-muted sm:min-w-72"
        >
          <span className="font-medium">라인 선택</span>
        <select
          id="discovery-channel"
          className="h-11 min-w-48 rounded-lg border-none bg-admin-surface-section px-4 text-sm text-admin-text-strong outline-none ring-0 focus:ring-2 focus:ring-admin-primary/20"
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
      </div>
      {channelId ? (
        <Link
          href={`/content/${encodeURIComponent(channelId)}/jobs`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-admin-primary hover:underline"
        >
          이 라인의 제작 아이템 보기
          <ArrowUpRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
