'use client';

import { getErrorMessage } from '@packages/utils';
import { useMemo } from 'react';

import { useContentJobDraft } from '@/entities/content-job';
import { buildContentJobDetailViewModel } from '../../model';
import { ContentJobDetailContext } from '../shared/content-job-detail-context';
import { ContentJobDetailLogsView } from '../shared/content-job-detail-logs-view';
import { ContentJobDetailMetricsCard } from '../shared/content-job-detail-metrics-card';
import { ContentJobDetailOverviewView } from '../overview/content-job-detail-overview-view';
import { ContentJobDetailTemplatesView } from '../shared/content-job-detail-templates-view';

type ContentJobOperationsPanelProps = {
  jobId: string;
};

export function ContentJobOperationsPanel({ jobId }: ContentJobOperationsPanelProps) {
  const detailQuery = useContentJobDraft({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data ?? undefined;
  const detailVm = useMemo(() => buildContentJobDetailViewModel(detail), [detail]);

  if (!jobId) {
    return <p className="text-sm text-muted-foreground">제작 아이템을 선택하세요.</p>;
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
        jobId={jobId}
        detail={detail}
        readyAssetCount={detailVm.readyAssetCount}
      />
      <ContentJobDetailTemplatesView
        compareRows={detailVm.compareRows}
        experimentOptions={detailVm.experimentOptions}
      />
      <ContentJobDetailLogsView logs={detailVm.logs} />
    </div>
  );
}
