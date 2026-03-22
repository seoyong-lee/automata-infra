'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { ReadinessChip } from '../../lib/content-job-workflow';

type ContentJobReadinessChecklistProps = {
  chips: ReadinessChip[];
};

export function ContentJobReadinessChecklist({ chips }: ContentJobReadinessChecklistProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="w-full text-xs font-medium text-muted-foreground">준비 상태</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
            chip.state === 'done' &&
              'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
            chip.state === 'needed' &&
              'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100',
            chip.state === 'blocked' &&
              'border-destructive/40 bg-destructive/10 text-destructive dark:text-destructive',
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
