'use client';

import Link from 'next/link';

import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import { JobWorkActionButtonGroup } from './job-work-action-button-group';

type Props = {
  jobId: string;
  resolution: JobWorkActionResolution;
  onAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailWorkHeaderActions({ jobId, resolution, onAction }: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <JobWorkActionButtonGroup resolution={resolution} onAction={onAction} />
      <div className="flex flex-wrap gap-3 border-t border-border pt-2 text-xs sm:border-0 sm:pt-0">
        <Link
          href={`/jobs/${jobId}/timeline`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          실행 이력
        </Link>
        <Link
          href="/reviews"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          검수 큐
        </Link>
      </div>
    </div>
  );
}
