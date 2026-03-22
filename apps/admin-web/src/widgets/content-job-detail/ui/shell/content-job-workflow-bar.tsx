'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';
import { Fragment, useMemo } from 'react';

import type { WorkflowNavItem } from '../../lib/content-job-workflow';

type ContentJobWorkflowBarProps = {
  stages: WorkflowNavItem[];
};

type WorkflowGroupKey =
  | 'overview'
  | 'planning'
  | 'production'
  | 'review'
  | 'publishPrep'
  | 'publish';

type WorkflowStageGroup = {
  key: WorkflowGroupKey;
  label: string;
  description: string;
  href: string;
  isCurrent: boolean;
  state: WorkflowNavItem['state'];
};

const GROUP_META: Array<{
  key: WorkflowGroupKey;
  label: string;
  description: string;
  stages: WorkflowNavItem['key'][];
}> = [
  {
    key: 'overview',
    label: '개요',
    description: '아이템 상태와 다음 행동 확인',
    stages: ['overview'],
  },
  {
    key: 'planning',
    label: '기획',
    description: '아이디어와 스크립트 정리',
    stages: ['idea', 'script'],
  },
  { key: 'production', label: '제작', description: '이미지·음성·영상 준비', stages: ['assets'] },
  { key: 'review', label: '검수', description: '품질 확인과 수정 결정', stages: ['review'] },
  {
    key: 'publishPrep',
    label: '발행 준비',
    description: '문구 작성과 출고 준비',
    stages: ['publishDraft', 'queue'],
  },
  {
    key: 'publish',
    label: '발행',
    description: '예약·발행과 결과 확인',
    stages: ['schedule', 'result'],
  },
];

function stateBadgeLabel(stage: WorkflowStageGroup): string {
  if (stage.isCurrent) {
    return '현재';
  }
  if (stage.state === 'complete') {
    return '완료';
  }
  if (stage.state === 'blocked') {
    return '막힘';
  }
  return '필요';
}

function deriveGroupState(groupStages: WorkflowNavItem[]): WorkflowNavItem['state'] {
  if (groupStages.some((stage) => stage.isCurrent)) {
    return 'upcoming';
  }
  if (groupStages.every((stage) => stage.state === 'complete')) {
    return 'complete';
  }
  if (groupStages.some((stage) => stage.state === 'upcoming')) {
    return 'upcoming';
  }
  if (groupStages.every((stage) => stage.state === 'blocked')) {
    return 'blocked';
  }
  return 'upcoming';
}

export function ContentJobWorkflowBar({ stages }: ContentJobWorkflowBarProps) {
  const groupedStages = useMemo<WorkflowStageGroup[]>(
    () =>
      GROUP_META.map((group) => {
        const groupStages = stages.filter((stage) => group.stages.includes(stage.key));
        const currentStage = groupStages.find((stage) => stage.isCurrent);
        const href = (currentStage ?? groupStages[0])?.href ?? '#';
        return {
          key: group.key,
          label: group.label,
          description: group.description,
          href,
          isCurrent: Boolean(currentStage),
          state: deriveGroupState(groupStages),
        };
      }),
    [stages],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1 px-1">
        <p className="text-xs font-medium text-muted-foreground">운영 단계</p>
        <p className="text-sm text-muted-foreground">
          필요한 단계만 골라 아래에서 바로 작업합니다.
        </p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <div className="flex min-w-max items-stretch gap-0">
          {groupedStages.map((stage, index) => {
            return (
              <Fragment key={stage.key}>
                <Link
                  href={stage.href}
                  scroll={!stage.href.includes('#')}
                  className={cn(
                    'flex w-36 shrink-0 flex-col rounded-2xl border bg-background p-3 transition-colors',
                    stage.isCurrent
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : stage.state === 'complete'
                        ? 'border-emerald-500/35'
                        : stage.state === 'blocked'
                          ? 'border-border opacity-70'
                          : 'border-border hover:bg-accent hover:text-accent-foreground',
                  )}
                  title={stage.state === 'blocked' ? '선행 단계를 먼저 완료하세요.' : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold',
                        stage.isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : stage.state === 'complete'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {stateBadgeLabel(stage)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                </Link>
                {index < stages.length - 1 ? (
                  <div className="flex w-7 shrink-0 items-center" aria-hidden>
                    <div className="h-px w-full bg-border" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
