'use client';

import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="admin-section-shell p-5">
        <ContentJobDetailWorkHeaderMeta detail={detail} resolution={resolution} />
      </div>
      <div className="admin-section-shell p-5">
        <ContentJobDetailWorkHeaderActions
          jobId={jobId}
          resolution={resolution}
          onAction={onAction}
        />
      </div>
    </div>
  );
}
