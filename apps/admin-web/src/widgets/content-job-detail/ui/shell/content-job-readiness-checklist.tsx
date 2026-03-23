'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { ReadinessChip } from '../../lib/content-job-workflow';

type ContentJobReadinessChecklistProps = {
  chips: ReadinessChip[];
};

export function ContentJobReadinessChecklist({ chips }: ContentJobReadinessChecklistProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <span className="w-full text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-primary">
        Readiness
      </span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
            chip.state === 'done' &&
              'border-admin-status-success/20 bg-admin-status-success-surface text-admin-status-success',
            chip.state === 'needed' &&
              'border-admin-status-warning/20 bg-admin-status-warning-surface text-admin-status-warning',
            chip.state === 'blocked' &&
              'border-admin-status-error/20 bg-admin-status-error-surface text-admin-status-error',
          )}
        >
          {chip.label}
          <span className="ml-1.5 tabular-nums opacity-80">
            {chip.state === 'done' ? '완료' : chip.state === 'blocked' ? '막힘' : '필요'}
          </span>
        </Link>
      ))}
    </div>
  );
}
