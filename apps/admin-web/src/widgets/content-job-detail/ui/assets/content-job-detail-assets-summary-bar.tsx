'use client';

import type { AssetGenerationModality } from '@packages/graphql';
import { useJobExecutionsQuery } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useMemo } from 'react';

import { formatJobTimestamp } from '../../lib/format-job-timestamp';
import type { JobDraftDetail } from '../../model/types';
import type { SceneAssetCard } from '../../model/job-detail-scene-assets';

type ContentJobDetailAssetsSummaryBarProps = {
  jobId: string;
  detail?: JobDraftDetail;
  cards: SceneAssetCard[];
  isRunning: boolean;
  error: unknown;
  onRunModality: (modality: AssetGenerationModality) => void;
};

function ratioLine(ready: number, total: number, label: string) {
  return (
    <p className="text-sm">
      <span className="font-medium text-foreground">{label}</span>{' '}
      <span className="tabular-nums text-muted-foreground">
        {ready} / {total} 준비
      </span>
    </p>
  );
}

export function ContentJobDetailAssetsSummaryBar({
  jobId,
  detail,
  cards,
  isRunning,
  error,
  onRunModality,
}: ContentJobDetailAssetsSummaryBarProps) {
  const execQuery = useJobExecutionsQuery({ jobId }, { enabled: Boolean(jobId) });
  const total = cards.length;
  const imageReady = cards.filter((c) => c.image.status === 'READY').length;
  const voiceReady = cards.filter((c) => c.voice.status === 'READY').length;
  const videoReady = cards.filter((c) => c.video.status === 'READY').length;

  const lastAssetRun = useMemo(() => {
    const items = execQuery.data ?? [];
    const assetRuns = items.filter((e) => e.stageType === 'ASSET_GENERATION');
    const sorted = [...assetRuns].sort((a, b) => {
      const ta = new Date(a.completedAt ?? a.startedAt).getTime();
      const tb = new Date(b.completedAt ?? b.startedAt).getTime();
      return tb - ta;
    });
    return sorted[0];
  }, [execQuery.data]);

  const adoptedId = detail?.job.approvedAssetExecutionId?.trim();

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">에셋 준비</CardTitle>
        <p className="text-sm text-muted-foreground">
          씬별 이미지·음성·영상을 확인하고, 비어 있는 항목만 다시 생성합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 rounded-md border border-border p-3">
            {ratioLine(imageReady, total, '이미지')}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isRunning || total === 0}
              onClick={() => onRunModality('IMAGE')}
            >
              이미지 전체 생성
            </Button>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            {ratioLine(voiceReady, total, '음성')}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isRunning || total === 0}
              onClick={() => onRunModality('VOICE')}
            >
              음성 전체 생성
            </Button>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            {ratioLine(videoReady, total, '영상')}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={isRunning || total === 0}
              onClick={() => onRunModality('VIDEO')}
            >
              영상 전체 생성
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {lastAssetRun ? (
            <p>
              마지막 에셋 실행:{' '}
              <span className="text-foreground">
                {formatJobTimestamp(lastAssetRun.completedAt ?? lastAssetRun.startedAt)}
              </span>
              {lastAssetRun.status === 'RUNNING' || lastAssetRun.status === 'QUEUED' ? (
                <Badge variant="outline" className="ml-2">
                  {lastAssetRun.status}
                </Badge>
              ) : null}
            </p>
          ) : (
            <p>아직 에셋 단계 실행 이력이 없습니다.</p>
          )}
          {adoptedId ? (
            <p>
              채택된 에셋 실행:{' '}
              <span className="font-mono text-xs text-foreground">{adoptedId}</span>
            </p>
          ) : (
            <p>채택된 에셋 실행이 없습니다.</p>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      </CardContent>
    </Card>
  );
}
