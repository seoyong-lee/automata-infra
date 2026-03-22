'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import { getPipelineStageIndex } from '../../lib/pipeline-stage';
import type { JobWorkActionResolution, JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';
import { ExperimentOption, JobDraftDetail } from '../../model';
import { ContentJobDetailOverviewMetaCards } from './content-job-detail-overview-meta-cards';
import { ContentJobDetailOverviewNextActionCard } from './content-job-detail-overview-next-action-card';
import { ContentJobDetailOverviewSummaryCard } from './content-job-detail-overview-summary-card';
import { ContentJobDetailSourceLinkCard } from '../source/content-job-detail-source-link-card';

type ContentJobDetailOverviewViewProps = {
  jobId: string;
  detail?: JobDraftDetail;
  experimentOptions: ExperimentOption[];
  readyAssetCount: number;
  stylePreset: string;
  /** 제작 아이템 상세에서만 전달. 임베드 패널에서는 생략 가능. */
  workActionResolution?: JobWorkActionResolution;
  onWorkAction?: (action: JobWorkPrimaryAction) => void;
  sameLineNewJobHref?: string;
};

// eslint-disable-next-line complexity -- 소재·다음 액션·요약·메타 섹션 조합
export function ContentJobDetailOverviewView({
  jobId,
  detail,
  experimentOptions,
  readyAssetCount,
  stylePreset,
  workActionResolution,
  onWorkAction,
  sameLineNewJobHref,
}: ContentJobDetailOverviewViewProps) {
  const status = detail?.job.status ?? 'DRAFT';
  const stageIdx = getPipelineStageIndex(status);
  const contentId = detail?.job.contentId;
  const channelLinked = Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID;
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

      <ContentJobDetailOverviewSummaryCard
        jobId={jobId}
        detail={detail}
        status={status}
        stageIdx={stageIdx}
        channelLinked={channelLinked}
        contentId={contentId}
        sameLineNewJobHref={sameLineNewJobHref}
      />

      <ContentJobDetailOverviewMetaCards
        detail={detail}
        experimentOptions={experimentOptions}
        readyAssetCount={readyAssetCount}
        stylePreset={stylePreset}
        totalScenes={totalScenes}
      />
    </div>
  );
}
