'use client';

import { useState } from 'react';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { cn } from '@packages/ui';
import { getErrorMessage } from '@packages/utils';
import type { AssetUploadCategory, PipelineExecution } from '@packages/graphql';
import Link from 'next/link';

import { uploadFileToPresignedUrl } from '@/shared/lib/upload-file-to-presigned-url';
import { buildAssetPreviewUrlFromS3Key } from '../../lib/build-asset-preview-url';
import type { JobDraftDetail } from '../../model';

type ContentJobDetailRenderPreviewViewProps = {
  detail?: JobDraftDetail;
  readyAssetCount: number;
  workflowPublishHref: string;
  workflowTimelineHref: string;
  isRunningFinalComposition: boolean;
  isUploadingAsset: boolean;
  isSavingBackgroundMusicSelection: boolean;
  runFinalCompositionError: Error | null;
  requestAssetUploadError: Error | null;
  setJobBackgroundMusicError: Error | null;
  onRequestAssetUpload: (input: {
    fileName: string;
    contentType: string;
    category: AssetUploadCategory;
    targetSceneId?: number;
  }) => Promise<{
    uploadUrl: string;
    s3Key: string;
    fileName: string;
    contentType: string;
    category: AssetUploadCategory;
  }>;
  onSetJobBackgroundMusic: (s3Key?: string) => Promise<unknown>;
  onRunFinalComposition: (opts?: { burnInSubtitles?: boolean }) => void;
  latestRenderExecution?: PipelineExecution;
};

const linkClassName =
  'inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground';

function hasAnyMedia(detail: JobDraftDetail | undefined, kind: 'image' | 'voice' | 'video') {
  const assets = detail?.assets ?? [];
  if (kind === 'image') {
    return assets.some((asset) => Boolean(asset.imageS3Key));
  }
  if (kind === 'voice') {
    return assets.some((asset) => Boolean(asset.voiceS3Key));
  }
  return assets.some((asset) => Boolean(asset.videoClipS3Key));
}

function formatExecutionTime(value?: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR');
}

function formatExecutionDuration(startedAt?: string, completedAt?: string | null) {
  if (!startedAt || !completedAt) {
    return '—';
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '—';
  }
  return `${Math.round((end - start) / 1000)}초`;
}

function getRenderStatusTone(status: PipelineExecution['status']) {
  if (status === 'SUCCEEDED') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'FAILED') {
    return 'bg-destructive/10 text-destructive';
  }
  return 'bg-amber-500/10 text-amber-800 dark:text-amber-300';
}

function getRenderStatusLabel(status: PipelineExecution['status']) {
  if (status === 'QUEUED') {
    return '대기 중';
  }
  if (status === 'RUNNING') {
    return '렌더링 중';
  }
  if (status === 'SUCCEEDED') {
    return '완료';
  }
  return '실패';
}

export function ContentJobDetailRenderPreviewView({
  detail,
  readyAssetCount,
  workflowPublishHref,
  workflowTimelineHref,
  isRunningFinalComposition,
  isUploadingAsset,
  isSavingBackgroundMusicSelection,
  runFinalCompositionError,
  requestAssetUploadError,
  setJobBackgroundMusicError,
  onRequestAssetUpload,
  onSetJobBackgroundMusic,
  onRunFinalComposition,
  latestRenderExecution,
}: ContentJobDetailRenderPreviewViewProps) {
  const [burnInSubtitles, setBurnInSubtitles] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const totalScenes = detail?.sceneJson?.scenes.length ?? detail?.assets.length ?? 0;
  const renderReady = totalScenes > 0 && readyAssetCount === totalScenes;
  const imageReady = hasAnyMedia(detail, 'image');
  const voiceReady = hasAnyMedia(detail, 'voice');
  const videoReady = hasAnyMedia(detail, 'video');
  const status = detail?.job.status ?? 'DRAFT';
  const previewUrl =
    buildAssetPreviewUrlFromS3Key(detail?.job.previewS3Key) ??
    buildAssetPreviewUrlFromS3Key(detail?.job.finalVideoS3Key);
  const thumbnailUrl = buildAssetPreviewUrlFromS3Key(detail?.job.thumbnailS3Key);
  const hasRenderedVideo = Boolean(detail?.job.previewS3Key || detail?.job.finalVideoS3Key);
  const backgroundMusicOptions = detail?.backgroundMusicOptions ?? [];
  const selectedBackgroundMusicS3Key = detail?.job.backgroundMusicS3Key;
  const selectedBackgroundMusicUrl = buildAssetPreviewUrlFromS3Key(selectedBackgroundMusicS3Key);

  const uploadBackgroundMusic = async () => {
    if (!selectedUploadFile) {
      return;
    }
    setUploadError(null);
    try {
      const uploaded = await onRequestAssetUpload({
        fileName: selectedUploadFile.name,
        contentType: selectedUploadFile.type || 'audio/mpeg',
        category: 'BACKGROUND_MUSIC',
      });
      await uploadFileToPresignedUrl({
        file: selectedUploadFile,
        uploadUrl: uploaded.uploadUrl,
        contentType: uploaded.contentType,
      });
      await onSetJobBackgroundMusic(uploaded.s3Key);
      setSelectedUploadFile(null);
    } catch (error) {
      setUploadError(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>렌더·미리보기</CardTitle>
          <CardDescription>
            에셋 준비가 끝나면 Shotstack 최종 합성을 실행하고, 결과 영상을 바로 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{status}</Badge>
            <span className="text-sm text-muted-foreground">
              씬 준비 {readyAssetCount}/{totalScenes || '—'}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                renderReady
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
              )}
            >
              {renderReady ? '렌더 검토 가능' : '렌더 전 보완 필요'}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">이미지</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {imageReady ? '준비됨' : '일부 또는 전체 미준비'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Shotstack 템플릿에 사용할 씬 대표 이미지 상태를 점검합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">음성</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {voiceReady ? '준비됨' : '일부 또는 전체 미준비'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                나레이션과 씬 길이의 어긋남이 없는지 렌더 전에 확인합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">영상 클립</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {videoReady ? '준비됨' : '선택 사항 또는 미준비'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                컷 어웨이와 모션 클립이 필요한 경우 최종 구성 전에 보강합니다.
              </p>
            </div>
          </div>
          {latestRenderExecution ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">렌더 실행 현황</p>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    getRenderStatusTone(latestRenderExecution.status),
                  )}
                >
                  {getRenderStatusLabel(latestRenderExecution.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                <div>
                  <p>시작 시각</p>
                  <p className="mt-1 text-foreground">
                    {formatExecutionTime(latestRenderExecution.startedAt)}
                  </p>
                </div>
                <div>
                  <p>완료 시각</p>
                  <p className="mt-1 text-foreground">
                    {formatExecutionTime(latestRenderExecution.completedAt)}
                  </p>
                </div>
                <div>
                  <p>소요 시간</p>
                  <p className="mt-1 text-foreground">
                    {formatExecutionDuration(
                      latestRenderExecution.startedAt,
                      latestRenderExecution.completedAt,
                    )}
                  </p>
                </div>
              </div>
              {latestRenderExecution.errorMessage ? (
                <p className="mt-3 text-sm text-destructive">
                  {latestRenderExecution.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">배경음악</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                이 잡에 업로드한 배경음악 중 하나를 골라 최종 렌더 전체 구간에 통으로 깔 수
                있습니다.
              </p>
            </div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={selectedBackgroundMusicS3Key ?? ''}
              disabled={isSavingBackgroundMusicSelection || isUploadingAsset}
              onChange={(event) =>
                void onSetJobBackgroundMusic(
                  event.target.value ? event.target.value : undefined,
                ).catch((error) => setUploadError(getErrorMessage(error)))
              }
            >
              <option value="">배경음악 없음</option>
              {backgroundMusicOptions.map((option) => (
                <option key={option.s3Key} value={option.s3Key}>
                  {option.fileName}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*"
                onChange={(event) => setSelectedUploadFile(event.target.files?.[0] ?? null)}
                disabled={isUploadingAsset}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!selectedUploadFile || isUploadingAsset}
                onClick={() => void uploadBackgroundMusic()}
              >
                {isUploadingAsset ? '업로드 중…' : 'S3에 업로드 후 선택'}
              </Button>
            </div>
            {selectedBackgroundMusicUrl ? (
              <audio
                key={selectedBackgroundMusicUrl}
                src={selectedBackgroundMusicUrl}
                controls
                className="w-full"
              />
            ) : null}
            {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
            {requestAssetUploadError ? (
              <p className="text-sm text-destructive">{getErrorMessage(requestAssetUploadError)}</p>
            ) : null}
            {setJobBackgroundMusicError ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(setJobBackgroundMusicError)}
              </p>
            ) : null}
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={burnInSubtitles}
              onChange={(event) => setBurnInSubtitles(event.target.checked)}
              disabled={isRunningFinalComposition}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">한글 자막 번인</p>
              <p className="text-xs leading-5 text-muted-foreground">
                켜면 각 씬의 `subtitle` 텍스트를 영상 하단에 함께 렌더링합니다.
              </p>
            </div>
          </label>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              onClick={() => onRunFinalComposition({ burnInSubtitles })}
              disabled={!renderReady || isRunningFinalComposition}
            >
              {isRunningFinalComposition ? '렌더링 중…' : 'Shotstack 렌더 실행'}
            </Button>
            {!renderReady ? (
              <span className="text-xs text-muted-foreground">
                모든 씬의 필수 에셋이 준비되어야 렌더를 시작할 수 있습니다.
              </span>
            ) : null}
          </div>
          {runFinalCompositionError ? (
            <p className="text-sm text-destructive">{getErrorMessage(runFinalCompositionError)}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>렌더 결과</CardTitle>
          <CardDescription>
            Shotstack 합성이 끝나면 preview 또는 final video를 여기서 바로 검토합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRenderedVideo && previewUrl ? (
            <div className="space-y-4">
              <video
                key={previewUrl}
                src={previewUrl}
                controls
                playsInline
                className="w-full rounded-xl border border-border bg-black"
              />
              <div className="flex flex-wrap gap-2">
                <Link href={previewUrl} target="_blank" className={linkClassName}>
                  미리보기 열기
                </Link>
                {detail?.job.finalVideoS3Key ? (
                  <Link
                    href={buildAssetPreviewUrlFromS3Key(detail.job.finalVideoS3Key) ?? previewUrl}
                    target="_blank"
                    className={linkClassName}
                  >
                    최종 영상 열기
                  </Link>
                ) : null}
              </div>
            </div>
          ) : thumbnailUrl ? (
            <div className="space-y-4">
              <img
                src={thumbnailUrl}
                alt="render thumbnail"
                className="w-full rounded-xl border border-border object-cover"
              />
              <p className="text-sm text-muted-foreground">
                썸네일은 준비됐지만 재생 가능한 preview 파일은 아직 없습니다.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 렌더 결과가 없습니다. 에셋 준비가 끝났다면 `Shotstack 렌더 실행`을 눌러 주세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최종 검토 루프</CardTitle>
          <CardDescription>
            렌더 결과를 확인하고 수정 포인트를 정리한 뒤 검수 단계로 넘깁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. 씬별 이미지, 음성, 클립 준비 상태를 맞춥니다.</p>
          <p>2. 최종 렌더 결과를 보고 컷 순서, 속도, 전환, 음성 길이를 점검합니다.</p>
          <p>3. 수정이 필요하면 에셋 단계로 돌아가 보정하고 다시 렌더합니다.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={workflowPublishHref} className={linkClassName}>
              검수 화면 보기
            </Link>
            <Link href={workflowTimelineHref} className={linkClassName}>
              실행 이력 보기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
