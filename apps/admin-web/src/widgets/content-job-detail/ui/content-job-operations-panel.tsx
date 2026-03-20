'use client';

import { getErrorMessage } from '@packages/utils';
import { useMemo } from 'react';

import { useContentJobDraft } from '@/entities/content-job';
import { buildContentJobDetailViewModel } from '../model';
import { ContentJobDetailContext } from './content-job-detail-context';
import { ContentJobDetailLogsView } from './content-job-detail-logs-view';
import { ContentJobDetailMetricsCard } from './content-job-detail-metrics-card';
import { ContentJobDetailOverviewView } from './content-job-detail-overview-view';
import { ContentJobDetailTemplatesView } from './content-job-detail-templates-view';

type ContentJobOperationsPanelProps = {
  jobId: string;
};

export function ContentJobOperationsPanel({ jobId }: ContentJobOperationsPanelProps) {
  const detailQuery = useContentJobDraft({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data ?? undefined;
  const detailVm = useMemo(() => buildContentJobDetailViewModel(detail), [detail]);

  if (!jobId) {
    return <p className="text-sm text-muted-foreground">콘텐츠를 선택하세요.</p>;
  }

  if (detailQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">작업 데이터를 불러오는 중입니다…</p>;
  }

  if (detailQuery.error) {
    return <p className="text-sm text-destructive">{getErrorMessage(detailQuery.error)}</p>;
  }

  return (
    <div className="space-y-6">
      <ContentJobDetailMetricsCard detail={detail} jobId={jobId} sceneCount={detailVm.sceneCount} />
      <ContentJobDetailContext detail={detail} />
      <ContentJobDetailOverviewView
        detail={detail}
        experimentOptions={detailVm.experimentOptions}
        readyAssetCount={detailVm.readyAssetCount}
        stylePreset={detailVm.seedFormInitialValue.stylePreset}
      />
      <ContentJobDetailTemplatesView
        compareRows={detailVm.compareRows}
        experimentOptions={detailVm.experimentOptions}
      />
      <ContentJobDetailLogsView logs={detailVm.logs} />
    </div>
  );
}
