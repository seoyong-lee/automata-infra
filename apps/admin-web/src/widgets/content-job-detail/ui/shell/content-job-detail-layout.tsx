'use client';

import type { ReactNode } from 'react';

import type { ContentJobDetailShellViewModel } from '../../model';
import type { JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';
import { ContentJobDetailHeroHeader } from './content-job-detail-hero-header';
import { ContentJobDetailStepper } from './content-job-detail-stepper';

type Props = {
  jobId: string;
  shellVm: ContentJobDetailShellViewModel;
  onAction: (action: JobWorkPrimaryAction) => void;
  children: ReactNode;
};

export function ContentJobDetailLayout({ jobId, shellVm, onAction, children }: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <ContentJobDetailHeroHeader
          jobBadge={shellVm.jobBadge}
          updatedAtLabel={shellVm.updatedAtLabel}
          title={shellVm.title}
          statusLabel={shellVm.statusLabel}
          targetDurationLabel={shellVm.targetDurationLabel}
          channelLabel={shellVm.channelLabel}
          sourceLabel={shellVm.sourceLabel}
          secondaryAction={shellVm.secondaryAction}
          primaryAction={shellVm.primaryAction}
          onAction={onAction}
        />
        <ContentJobDetailStepper jobId={jobId} activeStep={shellVm.activeStep} />
      </div>
      <div>{children}</div>
    </div>
  );
}
