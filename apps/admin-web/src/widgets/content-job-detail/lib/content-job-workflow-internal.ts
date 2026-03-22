import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import type { AdminJob } from '@packages/graphql';

import {
  publishPanelAnchor,
  type WorkflowNavItem,
  type WorkflowNavKey,
  type ReadinessChip,
} from './content-job-workflow-types';
import type { JobDetailRouteTabKey } from './detail-workspace-tabs';

export function channelConnected(job: AdminJob | undefined): boolean {
  const id = job?.contentId?.trim();
  return Boolean(id) && id !== ADMIN_UNASSIGNED_CONTENT_ID;
}

function hasTopicPlan(job: AdminJob | undefined): boolean {
  return Boolean(job?.topicS3Key);
}

function hasSceneJson(job: AdminJob | undefined, hasScenePayload: boolean): boolean {
  return Boolean(job?.sceneJsonS3Key) || hasScenePayload;
}

export function reviewDoneStatus(status: string): boolean {
  return (
    status === 'APPROVED' ||
    status === 'READY_TO_SCHEDULE' ||
    status === 'UPLOAD_QUEUED' ||
    status === 'UPLOADED' ||
    status === 'METRICS_COLLECTED'
  );
}

export function publishDraftDoneStatus(status: string): boolean {
  return (
    status === 'READY_TO_SCHEDULE' ||
    status === 'UPLOAD_QUEUED' ||
    status === 'UPLOADED' ||
    status === 'METRICS_COLLECTED'
  );
}

export function queueDoneStatus(status: string): boolean {
  return status === 'UPLOAD_QUEUED' || status === 'UPLOADED' || status === 'METRICS_COLLECTED';
}

const ASSET_DONE_STATUSES: AdminJob['status'][] = [
  'ASSETS_READY',
  'VALIDATING',
  'RENDER_PLAN_READY',
  'RENDERED',
  'REVIEW_PENDING',
  'APPROVED',
  'REJECTED',
  'READY_TO_SCHEDULE',
  'UPLOAD_QUEUED',
  'UPLOADED',
  'METRICS_COLLECTED',
];

export type WorkflowDerived = {
  status: string;
  chOk: boolean;
  topicOk: boolean;
  sceneOk: boolean;
  assetsComplete: boolean;
  reviewComplete: boolean;
  draftComplete: boolean;
  queueComplete: boolean;
  scheduleComplete: boolean;
};

export function deriveWorkflowState(args: {
  job: AdminJob | undefined;
  hasScenePayload: boolean;
  sceneCount: number;
  readyAssetCount: number;
}): WorkflowDerived {
  const { job, hasScenePayload, sceneCount, readyAssetCount } = args;
  const status = job?.status ?? 'DRAFT';
  const chOk = channelConnected(job);
  const topicOk = hasTopicPlan(job);
  const sceneOk = hasSceneJson(job, hasScenePayload);
  const assetsComplete =
    topicOk &&
    sceneOk &&
    sceneCount > 0 &&
    readyAssetCount >= sceneCount &&
    ASSET_DONE_STATUSES.includes(status as AdminJob['status']);

  return {
    status,
    chOk,
    topicOk,
    sceneOk,
    assetsComplete,
    reviewComplete: reviewDoneStatus(status),
    draftComplete: publishDraftDoneStatus(status),
    queueComplete: queueDoneStatus(status),
    scheduleComplete: status === 'UPLOADED' || status === 'METRICS_COLLECTED',
  };
}

export function normalizePublishHash(publishHash: string): string {
  const known =
    publishHash === publishPanelAnchor.review ||
    publishHash === publishPanelAnchor.publishDraft ||
    publishHash === publishPanelAnchor.queue;
  return known ? publishHash : '';
}

function isPublishPanelCurrent(
  activeTab: JobDetailRouteTabKey,
  publishHashNorm: string,
  panel: keyof typeof publishPanelAnchor,
): boolean {
  if (activeTab !== 'publish') {
    return false;
  }
  if (publishHashNorm === publishPanelAnchor[panel]) {
    return true;
  }
  return publishHashNorm === '' && panel === 'review';
}

export function isWorkflowNavCurrent(
  key: WorkflowNavKey,
  activeTab: JobDetailRouteTabKey,
  publishHashNorm: string,
): boolean {
  switch (key) {
    case 'overview':
      return activeTab === 'overview';
    case 'idea':
      return activeTab === 'ideation';
    case 'script':
      return activeTab === 'scene';
    case 'assets':
      return activeTab === 'assets';
    case 'review':
      return isPublishPanelCurrent(activeTab, publishHashNorm, 'review');
    case 'publishDraft':
      return isPublishPanelCurrent(activeTab, publishHashNorm, 'publishDraft');
    case 'queue':
      return isPublishPanelCurrent(activeTab, publishHashNorm, 'queue');
    case 'schedule':
      return false;
    case 'result':
      return activeTab === 'timeline';
    default:
      return false;
  }
}

type NavRow = Omit<WorkflowNavItem, 'isCurrent'>;

function queueRowState(d: WorkflowDerived): WorkflowNavItem['state'] {
  if (!d.chOk || !d.draftComplete) {
    return 'blocked';
  }
  return d.queueComplete ? 'complete' : 'upcoming';
}

function buildNavRowsPipeline(jobId: string, d: WorkflowDerived): NavRow[] {
  const { topicOk, sceneOk, assetsComplete, reviewComplete, draftComplete } = d;
  return [
    {
      key: 'overview',
      label: '개요',
      href: `/jobs/${jobId}/overview`,
      state: 'complete',
    },
    {
      key: 'idea',
      label: '아이디어',
      href: `/jobs/${jobId}/ideation`,
      state: topicOk ? 'complete' : 'upcoming',
    },
    {
      key: 'script',
      label: '스크립트',
      href: `/jobs/${jobId}/scene`,
      state: !topicOk ? 'blocked' : sceneOk ? 'complete' : 'upcoming',
    },
    {
      key: 'assets',
      label: '에셋',
      href: `/jobs/${jobId}/assets`,
      state: !sceneOk ? 'blocked' : assetsComplete ? 'complete' : 'upcoming',
    },
    {
      key: 'review',
      label: '검수',
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.review}`,
      state: !assetsComplete ? 'blocked' : reviewComplete ? 'complete' : 'upcoming',
    },
    {
      key: 'publishDraft',
      label: '발행 문구',
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.publishDraft}`,
      state: !reviewComplete ? 'blocked' : draftComplete ? 'complete' : 'upcoming',
    },
    {
      key: 'queue',
      label: '출고 대기',
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.queue}`,
      state: queueRowState(d),
    },
  ];
}

function buildNavRowsTail(jobId: string, d: WorkflowDerived, scheduleHref: string): NavRow[] {
  const { status, chOk, scheduleComplete } = d;
  return [
    {
      key: 'schedule',
      label: '예약·발행',
      href: scheduleHref || `/jobs/${jobId}/publish#${publishPanelAnchor.queue}`,
      state: !chOk ? 'blocked' : scheduleComplete ? 'complete' : 'upcoming',
    },
    {
      key: 'result',
      label: '결과',
      href: `/jobs/${jobId}/timeline`,
      state: status === 'METRICS_COLLECTED' ? 'complete' : 'upcoming',
    },
  ];
}

export function buildWorkflowNavRows(
  jobId: string,
  d: WorkflowDerived,
  scheduleHref: string,
): NavRow[] {
  return [...buildNavRowsPipeline(jobId, d), ...buildNavRowsTail(jobId, d, scheduleHref)];
}

export function attachNavCurrent(
  rows: NavRow[],
  activeTab: JobDetailRouteTabKey,
  publishHashNorm: string,
): WorkflowNavItem[] {
  return rows.map((row) => ({
    ...row,
    isCurrent: isWorkflowNavCurrent(row.key, activeTab, publishHashNorm),
  }));
}

function deriveReviewChipState(status: string): ReadinessChip['state'] {
  if (status === 'REJECTED') {
    return 'blocked';
  }
  if (reviewDoneStatus(status)) {
    return 'done';
  }
  return 'needed';
}

function deriveDraftChipState(status: string): ReadinessChip['state'] {
  if (!reviewDoneStatus(status)) {
    return 'needed';
  }
  if (publishDraftDoneStatus(status)) {
    return 'done';
  }
  return 'needed';
}

function deriveQueueChipState(status: string): ReadinessChip['state'] {
  if (!publishDraftDoneStatus(status)) {
    return 'needed';
  }
  if (queueDoneStatus(status)) {
    return 'done';
  }
  return 'needed';
}

export function buildReadinessChipsInternal(args: {
  jobId: string;
  job: AdminJob | undefined;
}): ReadinessChip[] {
  const { jobId, job } = args;
  const status = job?.status ?? 'DRAFT';
  const chOk = channelConnected(job);
  const sourceOk = Boolean(job?.sourceItemId?.trim());

  return [
    {
      key: 'channel',
      label: '채널 연결',
      state: chOk ? 'done' : 'needed',
      href: `/jobs/${jobId}/overview`,
    },
    {
      key: 'source',
      label: '매체 연결',
      state: sourceOk ? 'done' : 'needed',
      href: `/jobs/${jobId}/overview`,
    },
    {
      key: 'review',
      label: '검수',
      state: deriveReviewChipState(status),
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.review}`,
    },
    {
      key: 'publishCopy',
      label: '발행 문구',
      state: deriveDraftChipState(status),
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.publishDraft}`,
    },
    {
      key: 'queue',
      label: '출고 큐',
      state: deriveQueueChipState(status),
      href: `/jobs/${jobId}/publish#${publishPanelAnchor.queue}`,
    },
  ];
}
