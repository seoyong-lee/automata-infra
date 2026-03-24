import type { AdminJob } from '@packages/graphql';

import type { JobDetailRouteTabKey } from '../lib/detail-workspace-tabs';
import { formatJobTimestamp } from '../lib/format-job-timestamp';
import type { JobWorkActionResolution, JobWorkPrimaryAction } from '../lib/resolve-job-work-action';

export type ContentJobDetailShellAction =
  | {
      kind: 'button';
      label: string;
      variant: 'outline' | 'primary';
      disabled?: boolean;
      action?: JobWorkPrimaryAction;
    }
  | {
      kind: 'link';
      label: string;
      variant: 'outline' | 'primary';
      href: string;
    };

export type ContentJobDetailShellViewModel = {
  jobBadge: string;
  updatedAtLabel: string;
  title: string;
  statusLabel: string;
  targetDurationLabel: string;
  channelLabel: string;
  sourceLabel: string;
  activeStep: 1 | 2 | 3 | 4;
  secondaryAction: ContentJobDetailShellAction;
  primaryAction: ContentJobDetailShellAction;
};

function formatDuration(totalSec?: number | null): string {
  if (typeof totalSec !== 'number' || Number.isNaN(totalSec)) {
    return '08:45';
  }
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function statusLabel(status?: string | null): string {
  if (status === 'FAILED') {
    return 'Failed';
  }
  if (status === 'UPLOADED' || status === 'METRICS_COLLECTED') {
    return 'Completed';
  }
  return 'In Progress';
}

function fallbackActiveStep(status?: string | null): 1 | 2 | 3 | 4 {
  if (status === 'DRAFT' || status === 'PLANNING' || status === 'PLANNED') {
    return 1;
  }
  if (status === 'SCENE_JSON_BUILDING' || status === 'SCENE_JSON_READY') {
    return 2;
  }
  if (status === 'ASSET_GENERATING' || status === 'ASSETS_READY' || status === 'VALIDATING') {
    return 3;
  }
  return 4;
}

function activeStepFromState(args: {
  activeTab: JobDetailRouteTabKey;
  status?: string | null;
}): 1 | 2 | 3 | 4 {
  const { activeTab, status } = args;
  switch (activeTab) {
    case 'ideation':
      return 1;
    case 'scene':
      return 2;
    case 'assets':
      return 3;
    case 'publish':
    case 'timeline':
      return 4;
    default:
      return fallbackActiveStep(status);
  }
}

function secondaryActionForTab(activeTab: JobDetailRouteTabKey): ContentJobDetailShellAction {
  return {
    kind: 'button',
    label: activeTab === 'overview' ? 'Cancel Job' : 'Save Draft',
    variant: 'outline',
  };
}

function linkPrimaryAction(
  label: string,
  href: string,
): ContentJobDetailShellAction {
  return {
    kind: 'link',
    label,
    variant: 'primary',
    href,
  };
}

function workflowPrimaryAction(
  workActionResolution: JobWorkActionResolution,
  label = workActionResolution.primary.label,
): ContentJobDetailShellAction {
  return {
    kind: 'button',
    label,
    variant: 'primary',
    disabled: workActionResolution.primary.disabled,
    action: workActionResolution.primary.action,
  };
}

function primaryActionForTab(args: {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  workActionResolution: JobWorkActionResolution;
}): ContentJobDetailShellAction {
  const { jobId, activeTab, workActionResolution } = args;
  switch (activeTab) {
    case 'overview':
      return workflowPrimaryAction(workActionResolution, 'Run Execution');
    case 'ideation':
      return linkPrimaryAction('Proceed to Scene Design', `/jobs/${jobId}/scene`);
    case 'scene':
      return linkPrimaryAction('Proceed to Assets', `/jobs/${jobId}/assets`);
    case 'assets':
      return linkPrimaryAction('Proceed to Publish', `/jobs/${jobId}/publish`);
    default:
      return workflowPrimaryAction(workActionResolution);
  }
}

function resolveJobBadge(job: AdminJob | undefined, jobId: string): string {
  return job?.jobId || jobId;
}

function resolveUpdatedAtLabel(job: AdminJob | undefined): string {
  return `Updated ${job?.updatedAt ? formatJobTimestamp(job.updatedAt) : '—'}`;
}

function resolveTitle(job: AdminJob | undefined): string {
  return job?.videoTitle?.trim() || 'Neural Architecture Documentary';
}

function resolveChannelLabel(job: AdminJob | undefined): string {
  return job?.contentId?.trim() || 'main-hq-distribution';
}

function resolveSourceLabel(job: AdminJob | undefined): string {
  return job?.sourceItemId?.trim() || 'asset-vault-04';
}

type BuildContentJobDetailShellViewModelArgs = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  job: AdminJob | undefined;
  workActionResolution: JobWorkActionResolution;
};

export function buildContentJobDetailShellViewModel({
  jobId,
  activeTab,
  job,
  workActionResolution,
}: BuildContentJobDetailShellViewModelArgs): ContentJobDetailShellViewModel {
  const step = activeStepFromState({ activeTab, status: job?.status });

  return {
    jobBadge: resolveJobBadge(job, jobId),
    updatedAtLabel: resolveUpdatedAtLabel(job),
    title: resolveTitle(job),
    statusLabel: statusLabel(job?.status),
    targetDurationLabel: formatDuration(job?.targetDurationSec),
    channelLabel: resolveChannelLabel(job),
    sourceLabel: resolveSourceLabel(job),
    activeStep: step,
    secondaryAction: secondaryActionForTab(activeTab),
    primaryAction: primaryActionForTab({ jobId, activeTab, workActionResolution }),
  };
}
