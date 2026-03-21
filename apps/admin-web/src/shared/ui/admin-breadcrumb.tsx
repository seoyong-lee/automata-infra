'use client';

import Link from 'next/link';
import { Fragment } from 'react';

export type AdminBreadcrumbSegment = {
  label: string;
  href?: string;
};

type AdminBreadcrumbProps = {
  segments: AdminBreadcrumbSegment[];
};

/**
 * 공통 브레드크럼: 호출부에서 세그먼트(라벨·선택 href)만 넘기면 경로에 맞게 표시한다.
 * 마지막 세그먼트는 현재 위치로 보고 링크를 렌더하지 않는다.
 */
export function AdminBreadcrumb({ segments }: AdminBreadcrumbProps) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const showLink = Boolean(segment.href) && !isLast;

        return (
          <Fragment key={`${index}-${segment.label}`}>
            {index > 0 ? <span className="text-muted-foreground/70">/</span> : null}
            {showLink ? (
              <Link href={segment.href!} className="hover:text-foreground">
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground' : undefined}>{segment.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
