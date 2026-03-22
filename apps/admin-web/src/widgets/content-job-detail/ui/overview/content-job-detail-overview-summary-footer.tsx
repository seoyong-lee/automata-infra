'use client';

import Link from 'next/link';

type Props = {
  jobId: string;
  channelLinked: boolean;
  sameLineNewJobHref?: string;
};

export function ContentJobDetailOverviewSummaryFooter({
  jobId,
  channelLinked,
  sameLineNewJobHref,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-t pt-4">
      <Link
        href={`/jobs/${jobId}/ideation`}
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        아이데이션으로
      </Link>
      <Link
        href={`/jobs/${jobId}/timeline`}
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        실행 이력
      </Link>
      <Link
        href="/reviews"
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        검수 큐
      </Link>
      {channelLinked && sameLineNewJobHref ? (
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md border border-dashed border-border bg-transparent px-3 text-sm font-normal text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => {
            window.location.href = sameLineNewJobHref;
          }}
        >
          같은 라인에 새 제작 아이템…
        </button>
      ) : null}
    </div>
  );
}
