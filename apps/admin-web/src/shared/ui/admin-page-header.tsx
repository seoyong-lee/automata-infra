import { cn } from '@packages/ui';
import type { ReactNode } from 'react';
import { AdminPageBack } from './admin-page-back';

export type AdminPageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: ReactNode;
  /** Rendered above the title (e.g. breadcrumb). No card or border. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {eyebrow ? <div className="text-sm text-muted-foreground">{eyebrow}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4 mt-6">
        <div className="min-w-0 space-y-1">
          {backHref ? <AdminPageBack href={backHref} label={backLabel} /> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? (
            <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
