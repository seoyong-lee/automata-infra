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
    description: '아이템의 상태, 연결 정보, 다음 행동을 빠르게 파악합니다.',
    nextHint: '아이디어와 연결 상태를 확인한 뒤 다음 단계로 이동합니다.',
  },
  idea: {
    title: '아이디어',
    description: '주제, 시드, 플랜의 방향을 정리하고 생성 흐름을 시작합니다.',
    nextHint: '토픽이 정리되면 스크립트 설계 단계로 넘어갑니다.',
  },
  script: {
    title: '스크립트',
    description: '씬 구조와 대본 구성을 확정해 후속 에셋 생성을 준비합니다.',
    nextHint: '씬 구성이 준비되면 에셋 생성 단계로 진행합니다.',
  },
  assets: {
    title: '에셋',
    description: '이미지, 음성, 영상 등 씬별 결과물을 채우고 대표본을 고릅니다.',
    nextHint: '에셋이 준비되면 검수 단계에서 최종 확인합니다.',
  },
  review: {
    title: '검수',
    description: '사람이 최종 품질을 확인하고 승인 또는 수정 요청을 결정합니다.',
    nextHint: '검수가 끝나면 채널별 발행 문구를 작성합니다.',
  },
  publishDraft: {
    title: '발행 문구',
    description: '플랫폼별 제목, 설명, 태그, 썸네일을 다듬어 발행용 문구를 확정합니다.',
    nextHint: '문구 저장 후 출고 대기 큐에 올릴 준비를 합니다.',
  },
  queue: {
    title: '출고 대기',
    description: '채널 연결, 검수, 문구 작성 완료 여부를 확인하고 큐 적재를 처리합니다.',
    nextHint: '큐 적재가 끝나면 예약·발행 화면에서 실제 실행을 진행합니다.',
  },
  schedule: {
    title: '예약·발행',
    description: '채널별 예약 시각을 정하거나 즉시 발행을 실행합니다.',
    nextHint: '발행 결과와 외부 링크를 결과 단계에서 확인합니다.',
  },
  result: {
    title: '결과',
    description: '마지막 실행 결과, 실패 사유, 외부 링크를 검토하고 재시도합니다.',
    nextHint: '필요하면 이전 단계로 돌아가 수정 후 다시 발행합니다.',
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
