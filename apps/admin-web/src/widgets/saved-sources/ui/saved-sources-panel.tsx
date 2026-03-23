'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useSavedSourcesModel } from '../model/use-saved-sources-model';
import { SavedSourceDetailModal } from './saved-source-detail-modal';
import { SavedSourcesTable } from './saved-sources-table';
import { SavedSourcesToolbar } from './saved-sources-toolbar';

type Props = {
  channelFilter: string;
};

export function SavedSourcesPanel({ channelFilter }: Props) {
  const t = useTranslations('discovery.savedIdeas');
  const [detailId, setDetailId] = useState<string | null>(null);
  const model = useSavedSourcesModel(channelFilter);

  return (
    <section className="space-y-6">
      <SavedSourcesToolbar
        search={model.search}
        onSearchChange={model.setSearch}
        statusFilter={model.statusFilter}
        onStatusFilterChange={model.setStatusFilter}
      />

      {model.loadError ? (
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
      ) : null}
      {model.loading ? (
        <p className="text-sm text-admin-text-muted">{t('loading')}</p>
      ) : null}

      {!model.loading && model.filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-admin-outline-ghost/30 bg-admin-surface-base px-5 py-4 text-sm text-admin-text-muted">
          {model.merged.length === 0
            ? t('emptyAll')
            : t('emptyFiltered')}
        </p>
      ) : null}

      <SavedSourcesTable
        rows={model.filtered}
        jobCountBySource={model.jobCountBySource}
        onOpenDetail={(id) => setDetailId(id)}
      />

      <p className="text-xs text-admin-text-muted">
        {t('footer')}
      </p>

      <SavedSourceDetailModal detailId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}
