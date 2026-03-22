'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

import { JobDraftDetail } from '../../model';
import { buildAssetPreviewUrlFromS3Key } from '../../lib/build-asset-preview-url';
import { ContentJobDetailSceneAssetPreview } from './content-job-detail-scene-asset-preview';

type AssetStage = 'image' | 'voice' | 'video';

type ContentJobDetailAssetsViewProps = {
  detail?: JobDraftDetail;
  error: unknown;
  isRunning: boolean;
  onRun: () => void;
  stage: AssetStage;
};

const stageMeta: Record<
  AssetStage,
  {
    title: string;
    actionLabel: string;
    itemLabel: string;
    readyVerb: string;
  }
> = {
  image: {
    title: '이미지 생성',
    actionLabel: '이미지 생성 실행',
    itemLabel: '이미지',
    readyVerb: '준비됨',
  },
  voice: {
    title: '음성 생성',
    actionLabel: '음성 생성 실행',
    itemLabel: '음성',
    readyVerb: '준비됨',
  },
  video: {
    title: '영상 생성',
    actionLabel: '영상 생성 실행',
    itemLabel: '영상',
    readyVerb: '준비됨',
  },
};

const hasStageAsset = (
  detailAsset: NonNullable<JobDraftDetail['assets']>[number],
  stage: AssetStage,
) => {
  if (stage === 'image') {
    return Boolean(detailAsset.imageS3Key);
  }

  if (stage === 'voice') {
    return Boolean(detailAsset.voiceS3Key);
  }

  return Boolean(detailAsset.videoClipS3Key);
};

const getStageS3Key = (
  detailAsset: NonNullable<JobDraftDetail['assets']>[number],
  stage: AssetStage,
) => {
  if (stage === 'image') {
    return detailAsset.imageS3Key;
  }

  if (stage === 'voice') {
    return detailAsset.voiceS3Key;
  }

  return detailAsset.videoClipS3Key;
};

const previewKindByStage = {
  image: 'image',
  voice: 'voice',
  video: 'video',
} as const;

export function ContentJobDetailAssetsView({
  detail,
  error,
  isRunning,
  onRun,
  stage,
}: ContentJobDetailAssetsViewProps) {
  const meta = stageMeta[stage];
  const assets = detail?.assets ?? [];
  const readyCount = assets.filter((asset) => hasStageAsset(asset, stage)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          씬 {readyCount}/{assets.length} · {meta.itemLabel} {meta.readyVerb}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={isRunning} onClick={onRun}>
            {isRunning ? '생성 중...' : meta.actionLabel}
          </Button>
        </div>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 scene이 없습니다. 먼저 스크립트 및 JSON 단계를 완료해 주세요.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const ready = hasStageAsset(asset, stage);
              const s3Key = getStageS3Key(asset, stage);
              const previewUrl = buildAssetPreviewUrlFromS3Key(s3Key);
              return (
                <li
                  key={asset.sceneId}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium">Scene {asset.sceneId}</span>
                      <span className={ready ? 'text-foreground' : 'text-muted-foreground'}>
                        {ready ? meta.readyVerb : '대기'}
                      </span>
                    </div>
                    <ContentJobDetailSceneAssetPreview
                      kind={previewKindByStage[stage]}
                      previewUrl={previewUrl}
                      cdnBlocked={Boolean(s3Key) && !previewUrl}
                      status={ready ? 'READY' : 'PENDING'}
                      size="large"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      </CardContent>
    </Card>
  );
}
