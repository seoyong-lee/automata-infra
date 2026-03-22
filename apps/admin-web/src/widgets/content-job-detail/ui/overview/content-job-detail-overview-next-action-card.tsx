'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';

import { PIPELINE_STAGE_LABELS } from '../../lib/pipeline-stage';
import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import { JobWorkActionButtonGroup } from '../work-header/job-work-action-button-group';

type Props = {
  stageIdx: number;
  readyAssetCount: number;
  totalScenes: number;
  workActionResolution: JobWorkActionResolution;
  onWorkAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailOverviewNextActionCard({
  stageIdx,
  readyAssetCount,
  totalScenes,
  workActionResolution,
  onWorkAction,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>다음 액션</CardTitle>
        <CardDescription>
          지금 이 제작 아이템에서 우선 눌러야 할 작업입니다. 상단 작업 바와 동일한 단축 동작입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {workActionResolution.note ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {workActionResolution.note}
          </p>
        ) : null}
        <JobWorkActionButtonGroup resolution={workActionResolution} onAction={onWorkAction} />
        <div className="flex flex-wrap gap-4 border-t pt-4 text-sm text-muted-foreground">
          <span>
            에셋 준비{' '}
            <span className="font-medium tabular-nums text-foreground">
              {readyAssetCount}/{totalScenes || '—'}
            </span>
          </span>
          <span>
            대략 단계{' '}
            <span className="font-medium text-foreground">{PIPELINE_STAGE_LABELS[stageIdx]}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
