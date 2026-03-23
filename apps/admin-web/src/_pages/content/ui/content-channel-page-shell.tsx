'use client';

import { useAdminContents } from '@/entities/admin-content';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

type ContentChannelPageShellProps = {
  contentId: string;
  title: (args: { label?: string; contentId: string }) => ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

function ContentChannelSubnav({ contentId }: { contentId: string }) {
  const pathname = usePathname();
  const base = `/content/${encodeURIComponent(contentId)}`;
  const links = [
    { href: `${base}/jobs`, label: '제작 아이템', prefix: `${base}/jobs` },
    { href: `${base}/queue`, label: '출고 큐', prefix: `${base}/queue` },
    { href: `${base}/schedule`, label: '예약·발행', prefix: `${base}/schedule` },
    { href: `${base}/connections`, label: '매체 연결', prefix: `${base}/connections` },
  ];

  const discoveryHref = `/discovery?channel=${encodeURIComponent(contentId)}&tab=shortlist`;

  return (
    <div className="flex flex-col gap-2 border-b border-admin-outline-ghost pb-4 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex flex-wrap gap-1.5 text-sm" aria-label="채널 하위 메뉴">
        {links.map(({ href, label, prefix }) => {
          const active = pathname === prefix || pathname.startsWith(`${prefix}/`);
          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'rounded-md bg-admin-surface-section px-3 py-1.5 font-medium text-admin-primary'
                  : 'rounded-md px-3 py-1.5 text-admin-text-muted hover:bg-admin-surface-section hover:text-admin-primary'
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <Link
        href={discoveryHref}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm text-admin-text-muted hover:bg-admin-surface-section hover:text-admin-primary"
      >
        소재 찾기 →
      </Link>
    </div>
  );
}

export function ContentChannelPageShell({
  contentId,
  title,
  subtitle,
  actions,
  children,
}: ContentChannelPageShellProps) {
  const contentsQuery = useAdminContents({ limit: 200 });
  const label = useMemo(
    () => contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label,
    [contentsQuery.data?.items, contentId],
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref="/content"
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/content" className="hover:text-foreground">
              채널
            </Link>
            <span className="text-muted-foreground/70">/</span>
            <span className="text-foreground">{(label ?? contentId) || '—'}</span>
          </div>
        }
        title={title({ label, contentId })}
        subtitle={subtitle}
        actions={actions}
      />
      <ContentChannelSubnav contentId={contentId} />
      {children}
    </div>
  );
}
