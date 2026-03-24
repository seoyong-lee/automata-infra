'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { ReadinessChip } from '../../lib/content-job-workflow';

type ContentJobReadinessChecklistProps = {
  chips: ReadinessChip[];
};

export function ContentJobReadinessChecklist({ chips }: ContentJobReadinessChecklistProps) {
  const ideationChips = chips
    .filter((chip) => chip.key === 'channel' || chip.key === 'source' || chip.key === 'publishCopy')
    .map((chip) => ({
      ...chip,
      label:
        chip.key === 'channel' ? 'CHANNEL' : chip.key === 'source' ? 'SOURCE' : 'COPY',
    }));

  return (
    <div className="flex flex-wrap gap-2.5">
        {ideationChips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
            chip.state === 'done' &&
              'border-admin-status-success/20 bg-admin-status-success-surface text-admin-status-success',
            chip.state === 'needed' &&
              'border-admin-status-warning/20 bg-admin-status-warning-surface text-admin-status-warning',
            chip.state === 'blocked' &&
              'border-admin-status-error/20 bg-admin-status-error-surface text-admin-status-error',
          )}
        >
            <span
              className={cn(
                'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                chip.state === 'done' && 'bg-admin-status-success text-white',
                chip.state === 'needed' && 'bg-admin-status-warning text-white',
                chip.state === 'blocked' && 'bg-admin-status-error text-white',
              )}
            >
              {chip.state === 'done' ? '✓' : chip.state === 'blocked' ? '!' : '…'}
            </span>
          {chip.label}
          <span className="ml-1.5 tabular-nums opacity-80">
              {chip.state === 'done' ? 'OK' : chip.state === 'blocked' ? 'BLOCKED' : 'PENDING'}
          </span>
        </Link>
      ))}
    </div>
  );
}
