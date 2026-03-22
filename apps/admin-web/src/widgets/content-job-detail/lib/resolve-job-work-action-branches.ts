import type { AdminJob } from '@packages/graphql';

import type { JobWorkActionResolution, JobWorkPendingFlags } from './job-work-action-types';
import { PIPELINE_STAGE_LABELS, getPipelineStageIndex } from './pipeline-stage';

type Opts = {
  hasTopicPlan: boolean;
  hasSceneJson: boolean;
  sceneCount: number;
  readyAssetCount: number;
};

const EARLY = ['DRAFT', 'PLANNING', 'PLANNED'] as const;

function isEarlyStatus(status: string): boolean {
  return (EARLY as readonly string[]).includes(status);
}

export function pipelineStageLabelForJob(job: AdminJob | undefined): string {
  const status = job?.status ?? 'DRAFT';
  return PIPELINE_STAGE_LABELS[getPipelineStageIndex(status)];
}

export function resolveFailedBranch(pipelineStageLabel: string): JobWorkActionResolution {
  return {
    pipelineStageLabel,
    primary: { label: '실행 이력에서 확인', action: 'go_timeline', disabled: false },
    secondary: { label: '아이데이션으로', action: 'go_ideation', disabled: false },
    note: '마지막 단계가 실패했습니다. 로그를 확인한 뒤 재시도하세요.',
  };
}

export function resolveNoTopicBranch(
  pipelineStageLabel: string,
  status: string,
  opts: Opts,
  pending: JobWorkPendingFlags,
): JobWorkActionResolution | null {
  if (!isEarlyStatus(status) || opts.hasTopicPlan) {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: {
      label: pending.isRunningTopicPlan ? '토픽 플랜 실행 중…' : '토픽 플랜 실행',
      action: 'run_topic_plan',
      disabled: pending.isRunningTopicPlan,
    },
    secondary: { label: '아이데이션 탭', action: 'go_ideation', disabled: false },
  };
}

export function resolveNoSceneBranch(
  pipelineStageLabel: string,
  status: string,
  opts: Opts,
  pending: JobWorkPendingFlags,
): JobWorkActionResolution | null {
  if (!isEarlyStatus(status) || !opts.hasTopicPlan || opts.hasSceneJson) {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: {
      label: pending.isRunningSceneJson ? 'Scene JSON 생성 중…' : 'Scene JSON 생성',
      action: 'run_scene_json',
      disabled: pending.isRunningSceneJson,
    },
    secondary: { label: '씬 설계 탭', action: 'go_scene', disabled: false },
  };
}

export function resolveEarlyWithSceneBranch(
  pipelineStageLabel: string,
  status: string,
  opts: Opts,
  pending: JobWorkPendingFlags,
): JobWorkActionResolution | null {
  if (!isEarlyStatus(status) || !opts.hasTopicPlan || !opts.hasSceneJson) {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: {
      label: pending.isRunningAssetGeneration ? '에셋 생성 중…' : '에셋 생성',
      action: 'run_assets',
      disabled: pending.isRunningAssetGeneration,
    },
    secondary: { label: '에셋 탭', action: 'go_assets', disabled: false },
    note: '씬 설계가 준비되었습니다. 에셋을 생성합니다.',
  };
}

export function resolveSceneJsonBuildingBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (status !== 'SCENE_JSON_BUILDING') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '씬 설계에서 진행 중', action: 'go_scene', disabled: false },
  };
}

export function resolveSceneJsonReadyBranch(
  pipelineStageLabel: string,
  status: string,
  pending: JobWorkPendingFlags,
): JobWorkActionResolution | null {
  if (status !== 'SCENE_JSON_READY') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: {
      label: pending.isRunningAssetGeneration ? '에셋 생성 중…' : '에셋 생성',
      action: 'run_assets',
      disabled: pending.isRunningAssetGeneration,
    },
    secondary: { label: '에셋 탭', action: 'go_assets', disabled: false },
  };
}

export function resolveAssetGeneratingBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (status !== 'ASSET_GENERATING') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '에셋 탭에서 진행 중', action: 'go_assets', disabled: false },
  };
}

export function resolveAssetsReadyishBranch(
  pipelineStageLabel: string,
  status: string,
  opts: Opts,
): JobWorkActionResolution | null {
  if (!['ASSETS_READY', 'VALIDATING', 'RENDER_PLAN_READY', 'RENDERED'].includes(status)) {
    return null;
  }
  const gap =
    opts.sceneCount > 0 ? `${opts.readyAssetCount}/${opts.sceneCount}` : `${opts.readyAssetCount}`;
  return {
    pipelineStageLabel,
    primary: { label: '검수·작업 현황', action: 'open_reviews', disabled: false },
    secondary: { label: '렌더·출고 탭', action: 'go_publish', disabled: false },
    note:
      opts.sceneCount > 0 && opts.readyAssetCount < opts.sceneCount
        ? `에셋 준비 ${gap} — 렌더 전에 씬을 채워 주세요.`
        : `에셋 준비 ${gap}`,
  };
}

export function resolveReviewPendingBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (status !== 'REVIEW_PENDING') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '검수 큐 열기', action: 'open_reviews', disabled: false },
    secondary: { label: '렌더·출고 탭', action: 'go_publish', disabled: false },
  };
}

export function resolveApprovedBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (status !== 'APPROVED' && status !== 'READY_TO_SCHEDULE') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '출고·업로드 준비', action: 'go_publish', disabled: false },
    secondary: { label: '실행 이력', action: 'go_timeline', disabled: false },
  };
}

export function resolveRejectedBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (status !== 'REJECTED') {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '에셋 재작업', action: 'go_assets', disabled: false },
    secondary: { label: '검수 큐', action: 'open_reviews', disabled: false },
    note: '검수에서 반려되었습니다. 씬·에셋을 수정한 뒤 다시 제출하세요.',
  };
}

export function resolveUploadedBranch(
  pipelineStageLabel: string,
  status: string,
): JobWorkActionResolution | null {
  if (!['UPLOAD_QUEUED', 'UPLOADED', 'METRICS_COLLECTED'].includes(status)) {
    return null;
  }
  return {
    pipelineStageLabel,
    primary: { label: '출고 상태 보기', action: 'go_publish', disabled: false },
    secondary: { label: '실행 이력', action: 'go_timeline', disabled: false },
  };
}

export function resolveDefaultBranch(pipelineStageLabel: string): JobWorkActionResolution {
  return {
    pipelineStageLabel,
    primary: { label: '개요로', action: 'go_overview', disabled: false },
  };
}
