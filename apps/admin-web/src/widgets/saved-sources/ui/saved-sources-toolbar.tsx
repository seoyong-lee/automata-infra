'use client';

import { Input } from '@packages/ui/input';
import { Filter, Search } from 'lucide-react';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체 상태' },
  { value: 'IDEATING', label: '기획' },
  { value: 'READY_FOR_DISTRIBUTION', label: '배포 가능' },
  { value: 'ARCHIVED', label: '보관' },
];

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
};

export function SavedSourcesToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-admin-primary">
            Saved Ideas
          </span>
          <h2 className="mt-2 font-admin-display text-3xl font-extrabold tracking-tight text-admin-primary">
            저장한 아이디어
          </h2>
          <p className="mt-2 text-sm leading-6 text-admin-text-muted">
            채널에 귀속된 소재를 한곳에서 찾습니다. 제작 아이템 쪽에서는 저장된 소재를 고르고 연결만
            하면 됩니다.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-admin-surface-base p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-admin-text-muted" />
          <Input
            id="saved-src-search"
            placeholder="제목 또는 메모를 검색하세요"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 border-none bg-white pl-11 shadow-none"
          />
        </div>
        <div className="flex gap-3">
          <select
            id="saved-src-status"
            className="h-12 min-w-36 rounded-lg border-none bg-white px-4 text-sm font-medium text-admin-text-strong outline-none ring-0 focus:ring-2 focus:ring-admin-primary/20"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-admin-text-strong"
          >
            <Filter className="mr-2 size-4 text-admin-text-muted" />
            상세 필터
          </button>
        </div>
      </div>
    </>
  );
}
