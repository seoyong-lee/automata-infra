'use client';

import type { AssetGenerationModality } from '@packages/graphql';
import { cn } from '@packages/ui';
import Link from 'next/link';
import { useMemo } from 'react';

import type { AssetsViewMode } from '../../lib/detail-workspace-tabs';
import type { AssetStage } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { buildSceneAssetCards } from '../../model/job-detail-scene-assets';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';
import { ContentJobDetailAssetsSummaryBar } from './content-job-detail-assets-summary-bar';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';
import { ContentJobDetailSceneAssetsList } from './content-job-detail-scene-assets-list';

const stages: Array<{ stage: AssetStage; label: string }> = [
  { stage: 'image', label: '이미지' },
  { stage: 'voice', label: '음성' },
  { stage: 'video', label: '영상 클립' },
];

type ContentJobDetailAssetsHubViewProps = {
  jobId: string;
  assetStage: AssetStage;
  assetsViewMode: AssetsViewMode;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailAssetsHubView({
  jobId,
  assetStage,
  assetsViewMode,
  pageData,
}: ContentJobDetailAssetsHubViewProps) {
  const tabClass =
    'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

  const sceneCards = useMemo(() => buildSceneAssetCards(pageData.detail), [pageData.detail]);

  const runScoped = (input: { targetSceneId?: number; modality: AssetGenerationModality }) => {
    pageData.runAssetGeneration(input);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/jobs/${jobId}/assets`}
            scroll={false}
            className={cn(
              tabClass,
              assetsViewMode === 'scenes'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            씬별 보기
          </Link>
          <Link
            href={`/jobs/${jobId}/assets?view=byKind&stage=${assetStage}`}
            scroll={false}
            className={cn(
              tabClass,
              assetsViewMode === 'byKind'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            종류별 보기
          </Link>
        </div>
      </div>

      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="ASSET_GENERATION"
        approvedExecutionId={pageData.detail?.job.approvedAssetExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />

      {assetsViewMode === 'scenes' ? (
        <>
          <ContentJobDetailAssetsSummaryBar
            jobId={jobId}
            detail={pageData.detail}
            cards={sceneCards}
            isRunning={pageData.isRunningAssetGeneration}
            error={pageData.runAssetGenerationError}
            onRunModality={(modality) => runScoped({ modality })}
          />
          <ContentJobDetailSceneAssetsList
            jobId={jobId}
            cards={sceneCards}
            isRunning={pageData.isRunningAssetGeneration}
            onRegenerateScene={({ sceneId, modality }) =>
              runScoped({ targetSceneId: sceneId, modality })
            }
          />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {stages.map(({ stage, label }) => (
              <Link
                key={stage}
                href={`/jobs/${jobId}/assets?view=byKind&stage=${stage}`}
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
              title="BGM·SFX는 이후 스프린트에서 씬 단위 UI와 연동 예정입니다."
            >
              BGM·SFX
            </span>
            <span
              className={cn(
                tabClass,
                'cursor-not-allowed border border-dashed border-border opacity-60',
              )}
              title="자막은 이후 스프린트에서 씬 단위 UI와 연동 예정입니다."
            >
              자막
            </span>
          </div>
          <ContentJobDetailAssetsView
            detail={pageData.detail}
            error={pageData.runAssetGenerationError}
            isRunning={pageData.isRunningAssetGeneration}
            onRun={() => pageData.runAssetGeneration()}
            stage={assetStage}
          />
        </>
      )}
    </div>
  );
}
