'use client';

import { getErrorMessage } from '@packages/utils';
import { useMemo } from 'react';

import { useContentJobDraft } from '@/entities/content-job';
import { buildContentJobDetailViewModel } from '../../model';
import { ContentJobDetailOverviewView } from '../overview';
import { contentJobDetailShared } from '../shared';

type ContentJobOperationsPanelProps = {
  jobId: string;
};

export function ContentJobOperationsPanel({ jobId }: ContentJobOperationsPanelProps) {
  const {
    ContentJobDetailContext,
    ContentJobDetailLogsView,
    ContentJobDetailMetricsCard,
    ContentJobDetailTemplatesView,
  } = contentJobDetailShared;
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
