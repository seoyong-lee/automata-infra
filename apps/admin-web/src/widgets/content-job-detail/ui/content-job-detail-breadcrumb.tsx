'use client';

import Link from 'next/link';

import { JobDraftDetail } from '../model';

type ContentJobDetailBreadcrumbProps = {
  contentLineHref: string;
  detail?: JobDraftDetail;
};

export function ContentJobDetailBreadcrumb({
  contentLineHref,
  detail,
}: ContentJobDetailBreadcrumbProps) {
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Link href="/jobs" className="hover:text-foreground">
        콘텐츠 관리
      </Link>
      <span className="text-muted-foreground/70">/</span>
      <Link href={contentLineHref} className="hover:text-foreground">
        {detail?.job.channelId ?? 'channel'}
      </Link>
      <span className="text-muted-foreground/70">/</span>
      <span className="text-foreground">{contentType ?? 'job'}</span>
    </div>
  );
}
