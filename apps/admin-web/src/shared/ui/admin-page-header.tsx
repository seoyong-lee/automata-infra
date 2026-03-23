import { cn } from '@packages/ui';
import type { ReactNode } from 'react';
import { AdminPageBack } from './admin-page-back';

export type AdminPageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  title: ReactNode;
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
    <div className={cn('space-y-5', className)}>
      {eyebrow ? <div className="text-sm text-admin-text-muted">{eyebrow}</div> : null}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-3">
          {backHref ? <AdminPageBack href={backHref} label={backLabel} /> : null}
          <h1 className="font-admin-display text-4xl font-extrabold tracking-tight text-admin-primary md:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <div className="max-w-4xl text-sm leading-7 text-admin-text-muted md:text-[15px]">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
