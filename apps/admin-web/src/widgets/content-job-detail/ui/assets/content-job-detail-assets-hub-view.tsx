'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { AssetStage } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';

const stages: Array<{ stage: AssetStage; label: string }> = [
  { stage: 'image', label: '이미지' },
  { stage: 'voice', label: '음성' },
  { stage: 'video', label: '영상 클립' },
];

type ContentJobDetailAssetsHubViewProps = {
  jobId: string;
  assetStage: AssetStage;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailAssetsHubView({
  jobId,
  assetStage,
  pageData,
}: ContentJobDetailAssetsHubViewProps) {
  const tabClass =
    'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {stages.map(({ stage, label }) => (
          <Link
            key={stage}
            href={`/jobs/${jobId}/assets?stage=${stage}`}
            scroll={false}
            className={cn(
              tabClass,
              assetStage === stage
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {label}
          </Link>
        ))}
        <span
          className={cn(
            tabClass,
            'cursor-not-allowed border border-dashed border-border opacity-60',
          )}
          title="BGM·SFX는 씬 단위 후보·채택 UI와 연동 예정입니다."
        >
          BGM·SFX
        </span>
        <span
          className={cn(
            tabClass,
            'cursor-not-allowed border border-dashed border-border opacity-60',
          )}
          title="자막은 씬 단위 후보·채택 UI와 연동 예정입니다."
        >
          자막
        </span>
      </div>
      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="ASSET_GENERATION"
        approvedExecutionId={pageData.detail?.job.approvedAssetExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />
      <ContentJobDetailAssetsView
        detail={pageData.detail}
        error={pageData.runAssetGenerationError}
        isRunning={pageData.isRunningAssetGeneration}
        onRun={pageData.runAssetGeneration}
        stage={assetStage}
      />
    </div>
  );
}
