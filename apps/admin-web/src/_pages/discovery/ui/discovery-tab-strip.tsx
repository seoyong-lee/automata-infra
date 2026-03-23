'use client';

import { cn } from '@packages/ui';
import { useTranslations } from 'next-intl';
import { DISCOVERY_TAB_IDS, type DiscoveryTabId } from '../lib/discovery-tabs';

type Props = {
  tab: DiscoveryTabId;
  onTabChange: (nextTab: DiscoveryTabId) => void;
};

export function DiscoveryTabStrip({ tab, onTabChange }: Props) {
  const t = useTranslations('discovery.tabs');

  return (
    <div className="border-b border-admin-outline-ghost/60">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="소재 찾기 단계">
        {DISCOVERY_TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              'relative px-6 py-3 text-sm font-bold transition-colors',
              tab === id
                ? 'top-px border-b-[3px] border-admin-primary text-admin-primary'
                : 'text-admin-text-muted hover:text-admin-primary',
            )}
            onClick={() => onTabChange(id)}
          >
            {t(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
