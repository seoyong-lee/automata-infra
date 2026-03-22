import type { AdminJob } from '@packages/graphql';

import {
  attachNavCurrent,
  buildReadinessChipsInternal,
  buildWorkflowNavRows,
  deriveWorkflowState,
  normalizePublishHash,
} from './content-job-workflow-internal';
import type { ReadinessChip, WorkflowNavItem, WorkflowNavKey } from './content-job-workflow-types';
import type { JobDetailRouteTabKey } from './detail-workspace-tabs';

export { publishPanelAnchor } from './content-job-workflow-types';
export type {
  ReadinessChip,
  ReadinessKey,
  WorkflowNavItem,
  WorkflowNavKey,
} from './content-job-workflow-types';

export type WorkflowStageMeta = {
  title: string;
  description: string;
  nextHint: string;
};

const WORKFLOW_STAGE_META: Record<WorkflowNavKey, WorkflowStageMeta> = {
  overview: {
    title: '개요',
    description: '상태와 다음 행동을 빠르게 확인합니다.',
    nextHint: '기획과 연결 상태를 확인한 뒤 다음 단계로 이동합니다.',
  },
  idea: {
    title: '아이디어',
    description: '주제와 포맷 방향을 정리합니다.',
    nextHint: '방향이 정리되면 스크립트 단계로 넘어갑니다.',
  },
  script: {
    title: '스크립트',
    description: '대본 구조를 작성하고 수정합니다.',
    nextHint: '스크립트가 정리되면 에셋 준비로 진행합니다.',
  },
  assets: {
    title: '에셋',
    description: '이미지, 음성, 영상 재료를 준비합니다.',
    nextHint: '에셋이 준비되면 검수 단계에서 최종 확인합니다.',
  },
  review: {
    title: '검수',
    description: '품질을 확인하고 수정 여부를 결정합니다.',
    nextHint: '검수가 끝나면 발행 문구를 작성합니다.',
  },
  publishDraft: {
    title: '발행 문구',
    description: '제목, 설명, 태그를 정리합니다.',
    nextHint: '문구 저장 후 출고 대기 준비를 합니다.',
  },
  queue: {
    title: '출고 대기',
    description: '출고 준비 완료 여부를 확인합니다.',
    nextHint: '큐 적재가 끝나면 예약·발행으로 진행합니다.',
  },
  schedule: {
    title: '예약·발행',
    description: '예약 시각을 정하거나 즉시 발행합니다.',
    nextHint: '발행 결과는 결과 단계에서 확인합니다.',
  },
  result: {
    title: '결과',
    description: '실행 결과와 실패 사유를 확인합니다.',
    nextHint: '필요하면 이전 단계로 돌아가 다시 진행합니다.',
  },
};

export function getWorkflowStageMeta(key: WorkflowNavKey): WorkflowStageMeta {
  return WORKFLOW_STAGE_META[key];
}

export function getCurrentWorkflowStage(stages: WorkflowNavItem[]): WorkflowNavItem | null {
  if (stages.length === 0) {
    return null;
  }
  return stages.find((stage) => stage.isCurrent) ?? stages[0];
}

export function getNextWorkflowStage(
  stages: WorkflowNavItem[],
  currentStageKey: WorkflowNavKey | undefined,
): WorkflowNavItem | null {
  if (!currentStageKey) {
    return null;
  }
  const currentIndex = stages.findIndex((stage) => stage.key === currentStageKey);
  if (currentIndex < 0 || currentIndex === stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1] ?? null;
}

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
