'use client';

import { Input } from '@packages/ui/input';
import { Filter, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('discovery.savedIdeas');
  const common = useTranslations('common');

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-admin-surface-base p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-admin-text-muted" />
        <Input
          id="saved-src-search"
          placeholder={t('searchPlaceholder')}
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
          <option value="">{t('allStatus')}</option>
          <option value="IDEATING">{t('ideating')}</option>
          <option value="READY_FOR_DISTRIBUTION">{t('ready')}</option>
          <option value="ARCHIVED">{t('archived')}</option>
        </select>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-admin-text-strong"
        >
          <Filter className="mr-2 size-4 text-admin-text-muted" />
          {common('detailFilter')}
        </button>
      </div>
    </div>
  );
}
