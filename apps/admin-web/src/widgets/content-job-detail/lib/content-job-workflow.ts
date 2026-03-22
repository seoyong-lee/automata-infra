import type { AdminJob } from '@packages/graphql';

import {
  attachNavCurrent,
  buildReadinessChipsInternal,
  buildWorkflowNavRows,
  deriveWorkflowState,
  normalizePublishHash,
} from './content-job-workflow-internal';
import type { ReadinessChip, WorkflowNavItem } from './content-job-workflow-types';
import type { JobDetailRouteTabKey } from './detail-workspace-tabs';

export { publishPanelAnchor } from './content-job-workflow-types';
export type {
  ReadinessChip,
  ReadinessKey,
  WorkflowNavItem,
  WorkflowNavKey,
} from './content-job-workflow-types';

export function buildContentJobWorkflowNav(args: {
  jobId: string;
  job: AdminJob | undefined;
  activeTab: JobDetailRouteTabKey;
  publishHash: string;
  /** `detail.sceneJson?.scenes` 존재 여부 — `useJobDetailWorkState` 와 동일 */
  hasScenePayload: boolean;
  sceneCount: number;
  readyAssetCount: number;
}): WorkflowNavItem[] {
  const { jobId, job, activeTab, publishHash, hasScenePayload, sceneCount, readyAssetCount } = args;
  const d = deriveWorkflowState({ job, hasScenePayload, sceneCount, readyAssetCount });
  const contentId = job?.contentId?.trim();
  const scheduleHref =
    d.chOk && contentId ? `/content/${encodeURIComponent(contentId)}/schedule` : '';
  const rows = buildWorkflowNavRows(jobId, d, scheduleHref);
  const publishHashNorm = normalizePublishHash(publishHash);
  return attachNavCurrent(rows, activeTab, publishHashNorm);
}

export function buildContentJobReadinessChips(args: {
  jobId: string;
  job: AdminJob | undefined;
}): ReadinessChip[] {
  return buildReadinessChipsInternal(args);
}
