'use client';

import type { JobWorkActionResolution, JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';
import type { JobDraftDetail } from '../../model';
import { ContentJobDetailWorkHeaderActions } from './content-job-detail-work-header-actions';
import { ContentJobDetailWorkHeaderMeta } from './content-job-detail-work-header-meta';

type ContentJobDetailWorkHeaderProps = {
  jobId: string;
  detail?: JobDraftDetail;
  resolution: JobWorkActionResolution;
  onAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailWorkHeader({
  jobId,
  detail,
  resolution,
  onAction,
}: ContentJobDetailWorkHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <ContentJobDetailWorkHeaderMeta detail={detail} resolution={resolution} />
      <ContentJobDetailWorkHeaderActions jobId={jobId} resolution={resolution} onAction={onAction} />
    </div>
  );
}
