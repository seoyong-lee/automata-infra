'use client';

import { useState } from 'react';

import { useSavedSourcesModel } from '../model/use-saved-sources-model';
import { SavedSourceDetailModal } from './saved-source-detail-modal';
import { SavedSourcesTable } from './saved-sources-table';
import { SavedSourcesToolbar } from './saved-sources-toolbar';

type Props = {
  channelFilter: string;
  onCreateClick: () => void;
};

export function SavedSourcesPanel({ channelFilter, onCreateClick }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const model = useSavedSourcesModel(channelFilter);

  return (
    <section className="space-y-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <SavedSourcesToolbar
        search={model.search}
        onSearchChange={model.setSearch}
        statusFilter={model.statusFilter}
        onStatusFilterChange={model.setStatusFilter}
        onCreateClick={onCreateClick}
      />

      {model.loadError ? (
        <p className="text-sm text-destructive">목록을 불러오지 못했습니다.</p>
      ) : null}
      {model.loading ? (
        <p className="text-sm text-muted-foreground">채널별 소재를 불러오는 중…</p>
      ) : null}

      {!model.loading && model.filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {model.merged.length === 0
            ? '등록된 소재가 없습니다. 위에서 새 소재를 만들거나, 자동 발굴 후보에서 승격해 보세요.'
            : '필터에 맞는 소재가 없습니다.'}
        </p>
      ) : null}

      <SavedSourcesTable
        rows={model.filtered}
        jobCountBySource={model.jobCountBySource}
        onOpenDetail={(id) => setDetailId(id)}
      />

      <p className="text-xs text-muted-foreground">
        기존 제작 아이템에 소재를 붙이려면 해당 제작의「개요」→「소재 연결」에서 선택합니다.
      </p>

      <SavedSourceDetailModal detailId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}
