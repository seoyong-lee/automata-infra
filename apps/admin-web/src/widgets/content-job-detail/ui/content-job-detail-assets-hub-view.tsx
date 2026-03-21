'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { AssetStage } from '../model';
import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';

const stages: Array<{ stage: AssetStage; label: string }> = [
  { stage: 'image', label: '이미지' },
  { stage: 'voice', label: '음성' },
  { stage: 'video', label: '영상' },
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
      </div>
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
