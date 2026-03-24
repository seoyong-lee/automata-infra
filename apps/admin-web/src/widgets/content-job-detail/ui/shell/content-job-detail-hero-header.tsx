'use client';

import { Button } from '@packages/ui/button';
import { cn } from '@packages/ui';
import Link from 'next/link';

import type { JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';
import type { ContentJobDetailShellAction } from '../../model';

type Props = {
  jobBadge: string;
  updatedAtLabel: string;
  title: string;
  statusLabel: string;
  targetDurationLabel: string;
  channelLabel: string;
  sourceLabel: string;
  secondaryAction: ContentJobDetailShellAction;
  primaryAction: ContentJobDetailShellAction;
  onAction: (action: JobWorkPrimaryAction) => void;
};

function renderAction(
  action: ContentJobDetailShellAction,
  onAction: (action: JobWorkPrimaryAction) => void,
) {
  const commonClassName =
    action.variant === 'primary'
      ? 'h-11 rounded-lg bg-[linear-gradient(135deg,var(--admin-primary),var(--admin-primary-container))] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(60,65,96,0.18)]'
      : 'h-11 rounded-lg border-admin-outline-ghost bg-white px-5 text-sm font-semibold text-admin-text-strong hover:bg-admin-surface-section';

  if (action.kind === 'link') {
    return (
      <Link
        key={`${action.kind}-${action.label}`}
        href={action.href}
        className={cn(
          'inline-flex items-center justify-center',
          commonClassName,
        )}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <Button
      key={`${action.kind}-${action.label}`}
      type="button"
      variant={action.variant === 'primary' ? 'default' : 'outline'}
      className={commonClassName}
      disabled={action.disabled}
      onClick={() => (action.action ? onAction(action.action) : undefined)}
    >
      {action.label}
    </Button>
  );
}

export function ContentJobDetailHeroHeader({
  jobBadge,
  updatedAtLabel,
  title,
  statusLabel,
  targetDurationLabel,
  channelLabel,
  sourceLabel,
  secondaryAction,
  primaryAction,
  onAction,
}: Props) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-[rgba(99,102,241,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-admin-primary">
            {jobBadge}
          </span>
          <span className="text-xs text-admin-text-muted">{updatedAtLabel}</span>
        </div>
        <h1 className="font-admin-display text-5xl font-extrabold tracking-tight text-admin-text-strong">
          {title}
        </h1>
        <div className="mt-5 flex flex-wrap items-end gap-6">
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">
              Status
            </span>
            <div className="flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold">{statusLabel}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">
              Target Duration
            </span>
            <span className="text-sm font-medium text-admin-text-strong">{targetDurationLabel}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">
              Channel
            </span>
            <span className="text-sm font-medium text-admin-primary">{channelLabel}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">
              Source
            </span>
            <span className="text-sm font-medium text-admin-primary">{sourceLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {renderAction(secondaryAction, onAction)}
        {renderAction(primaryAction, onAction)}
      </div>
    </div>
  );
}
