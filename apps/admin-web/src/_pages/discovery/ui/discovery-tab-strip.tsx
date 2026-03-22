'use client';

import { cn } from '@packages/ui';

import {
  DISCOVERY_TAB_IDS,
  DISCOVERY_TAB_LABELS,
  type DiscoveryTabId,
} from '../lib/discovery-tabs';

type Props = {
  tab: DiscoveryTabId;
  onTabChange: (nextTab: DiscoveryTabId) => void;
};

export function DiscoveryTabStrip({ tab, onTabChange }: Props) {
  return (
    <div className="border-b border-border">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="소재 찾기 단계">
        {DISCOVERY_TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border border-b-0 border-border bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onTabChange(id)}
          >
            {DISCOVERY_TAB_LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
