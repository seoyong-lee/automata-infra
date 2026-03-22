'use client';

import type { ImageGenerationProvider } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

import type { VoiceProfile } from '@/entities/voice-profile';
import { JobDraftDetail } from '../../model';
import { buildAssetPreviewUrlFromS3Key } from '../../lib/build-asset-preview-url';
import { ContentJobDetailSceneAssetPreview } from './content-job-detail-scene-asset-preview';
import { ContentJobDetailImageModelSelect } from './content-job-detail-image-model-select';
import { ContentJobDetailVoiceProfileSelect } from './content-job-detail-voice-profile-select';

type AssetStage = 'image' | 'voice' | 'video';

type ContentJobDetailAssetsViewProps = {
  detail?: JobDraftDetail;
  error: unknown;
  isRunning: boolean;
  isSubmitting: boolean;
  imageProvider: ImageGenerationProvider;
  onImageProviderChange: (value: ImageGenerationProvider) => void;
  voiceProfiles: VoiceProfile[];
  defaultVoiceProfileId?: string | null;
  isSavingVoiceProfileSelection: boolean;
  onJobVoiceProfileChange: (profileId?: string) => void;
  voiceSelectionError?: unknown;
  onRun: (imageProvider?: ImageGenerationProvider) => void;
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
  isSubmitting,
  imageProvider,
  onImageProviderChange,
  voiceProfiles,
  defaultVoiceProfileId,
  isSavingVoiceProfileSelection,
  onJobVoiceProfileChange,
  voiceSelectionError,
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
          {stage === 'image' ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <ContentJobDetailImageModelSelect
                value={imageProvider}
                disabled={isSubmitting}
                onChange={onImageProviderChange}
                className="min-w-[180px]"
              />
              <Button disabled={isSubmitting} onClick={() => onRun(imageProvider)}>
                {isSubmitting ? '요청 중…' : meta.actionLabel}
              </Button>
            </div>
          ) : stage === 'voice' ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <ContentJobDetailVoiceProfileSelect
                voiceProfiles={voiceProfiles}
                value={defaultVoiceProfileId}
                disabled={isSubmitting || isSavingVoiceProfileSelection}
                emptyLabel="기본 보이스 미지정 (시크릿 기본값)"
                onChange={onJobVoiceProfileChange}
                className="min-w-[220px]"
              />
              <Button disabled={isSubmitting} onClick={() => onRun()}>
                {isSubmitting ? '요청 중…' : meta.actionLabel}
              </Button>
            </div>
          ) : (
            <Button disabled={isSubmitting} onClick={() => onRun()}>
              {isSubmitting ? '요청 중…' : meta.actionLabel}
            </Button>
          )}
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
                <li key={asset.sceneId} className="rounded-lg border border-border bg-card p-4">
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
        {voiceSelectionError ? (
          <p className="text-sm text-destructive">{getErrorMessage(voiceSelectionError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
