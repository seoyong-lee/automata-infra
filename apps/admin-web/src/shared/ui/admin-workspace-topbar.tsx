import { cn } from '@packages/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

type AdminWorkspaceTopbarLink = {
  href: string;
  label: string;
  value?: ReactNode;
};

type AdminWorkspaceTopbarProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  links?: AdminWorkspaceTopbarLink[];
  actions?: ReactNode;
  className?: string;
};

export function AdminWorkspaceTopbar({
  eyebrow,
  title,
  description,
  links = [],
  actions,
  className,
}: AdminWorkspaceTopbarProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-admin-outline-ghost bg-[var(--admin-topbar)] px-5 py-4 shadow-sm backdrop-blur',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-admin-primary">
            {eyebrow}
          </p>
          <div className="space-y-1">
            <p className="font-admin-display text-xl font-extrabold tracking-tight text-admin-text-strong">
              {title}
            </p>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-admin-text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {links.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-full border border-admin-outline-ghost bg-admin-surface-card px-3 py-1.5 text-sm text-admin-text-muted transition-colors hover:bg-admin-surface-section hover:text-admin-primary"
            >
              <span>{link.label}</span>
              {link.value ? (
                <span className="font-semibold tabular-nums text-admin-text-strong">{link.value}</span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
