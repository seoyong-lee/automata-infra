'use client';

import { getPipelineStageIndex } from '../../lib/pipeline-stage';
import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import { JobDraftDetail } from '../../model';
import { ContentJobDetailOverviewNextActionCard } from './content-job-detail-overview-next-action-card';
import { ContentJobDetailSourceLinkCard } from '../source/content-job-detail-source-link-card';
import { ContentJobDetailOverviewRecentCard } from './content-job-detail-overview-recent-card';

type ContentJobDetailOverviewViewProps = {
  jobId: string;
  detail?: JobDraftDetail;
  readyAssetCount: number;
  /** 제작 아이템 상세에서만 전달. 임베드 패널에서는 생략 가능. */
  workActionResolution?: JobWorkActionResolution;
  onWorkAction?: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailOverviewView({
  jobId,
  detail,
  readyAssetCount,
  workActionResolution,
  onWorkAction,
}: ContentJobDetailOverviewViewProps) {
  const status = detail?.job.status ?? 'DRAFT';
  const stageIdx = getPipelineStageIndex(status);
  const totalScenes = detail?.sceneJson?.scenes?.length ?? detail?.assets.length ?? 0;

  return (
    <div className="space-y-6">
      <ContentJobDetailSourceLinkCard
        jobId={jobId}
        contentId={detail?.job.contentId}
        sourceItemId={detail?.job.sourceItemId}
      />

      {workActionResolution && onWorkAction ? (
        <ContentJobDetailOverviewNextActionCard
          stageIdx={stageIdx}
          readyAssetCount={readyAssetCount}
          totalScenes={totalScenes}
          workActionResolution={workActionResolution}
          onWorkAction={onWorkAction}
        />
      ) : null}

      <ContentJobDetailOverviewRecentCard jobId={jobId} detail={detail} />
    </div>
  );
}
