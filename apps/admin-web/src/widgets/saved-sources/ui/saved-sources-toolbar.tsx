'use client';

import { Button } from '@packages/ui/button';
import { Input } from '@packages/ui/input';

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
  onCreateClick: () => void;
};

export function SavedSourcesToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateClick,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">저장한 소재</h2>
          <Button type="button" size="sm" className="h-8" onClick={onCreateClick}>
            새 소재 만들기
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          채널에 귀속된 소재를 한곳에서 찾습니다. 제작 아이템 쪽에서는 저장된 소재를 고르고 연결만
          하면 됩니다.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto sm:min-w-[240px]">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="saved-src-search">
          검색
        </label>
        <Input
          id="saved-src-search"
          placeholder="제목·훅·메모…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="saved-src-status">
          상태
        </label>
        <select
          id="saved-src-status"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
