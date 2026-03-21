'use client';

import { Badge } from '@packages/ui/badge';
import { TableCell, TableRow } from '@packages/ui/table';
import type { KeyboardEvent } from 'react';

import type { AdminJob } from '@/entities/admin-job';

function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Props = {
  job: AdminJob;
  onOpen: (jobId: string) => void;
};

export function ContentJobsTableRow({ job, onOpen }: Props) {
  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(job.jobId);
    }
  };

  return (
    <TableRow
      role="link"
      tabIndex={0}
      className="cursor-pointer"
      onClick={() => onOpen(job.jobId)}
      onKeyDown={onKeyDown}
    >
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          {job.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[min(28rem,50vw)] font-medium">
        <span className="line-clamp-2">{job.videoTitle}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {job.contentType ?? '—'}
      </TableCell>
      <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
        {job.contentId}
      </TableCell>
      <TableCell className="text-right tabular-nums">{job.targetDurationSec}s</TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatUpdatedAt(job.updatedAt)}
      </TableCell>
      <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
        {job.jobId}
      </TableCell>
    </TableRow>
  );
}
