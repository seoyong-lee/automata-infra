'use client';

import type { JobDetailRouteTabKey } from '../../lib/detail-workspace-tabs';
import { ContentJobDetailStepper } from './content-job-detail-stepper';

type ContentJobWorkflowBarProps = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  activeStep: 1 | 2 | 3 | 4;
};

export function ContentJobWorkflowBar({
  jobId,
  activeTab: _activeTab,
  activeStep,
}: ContentJobWorkflowBarProps) {
  return <ContentJobDetailStepper jobId={jobId} activeStep={activeStep} />;
}
