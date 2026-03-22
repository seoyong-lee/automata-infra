'use client';

import { useState } from 'react';

import type { ImageGenerationProvider } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { cn } from '@packages/ui';

import type { VoiceProfile } from '@/entities/voice-profile';
import { SimpleModal } from '@/shared/ui/simple-modal';
import { modalityStatusLabel } from '../../lib/resolve-scene-asset-status';
import type {
  SceneAssetModalitySlice,
  SceneImageCandidateCard,
  SceneVoiceCandidateCard,
} from '../../model/job-detail-scene-assets';
import { ContentJobDetailSceneAssetPreview } from './content-job-detail-scene-asset-preview';
import { ContentJobDetailImageModelSelect } from './content-job-detail-image-model-select';
import { ContentJobDetailVoiceProfileSelect } from './content-job-detail-voice-profile-select';

type SceneAssetCellKind = 'image' | 'voice' | 'video';

type ContentJobDetailSceneAssetCellProps = {
  kind: SceneAssetCellKind;
  title: string;
  slice: SceneAssetModalitySlice;
  onRegenerate: () => void;
  disabled: boolean;
  imageCandidates?: SceneImageCandidateCard[];
  onSelectImageCandidate?: (candidateId: string) => void;
  voiceCandidates?: SceneVoiceCandidateCard[];
  onSelectVoiceCandidate?: (candidateId: string) => void;
  isSelectingImageCandidate?: boolean;
  imageProvider?: ImageGenerationProvider;
  onImageProviderChange?: (value: ImageGenerationProvider) => void;
  voiceProfiles?: VoiceProfile[];
  selectedVoiceProfileId?: string | null;
  isSavingVoiceProfileSelection?: boolean;
  onVoiceProfileChange?: (profileId?: string) => void;
  voiceProfileEmptyLabel?: string;
};

export function ContentJobDetailSceneAssetCell({
  kind,
  title,
  slice,
  onRegenerate,
  disabled,
  imageCandidates,
  onSelectImageCandidate,
  voiceCandidates,
  onSelectVoiceCandidate,
  isSelectingImageCandidate = false,
  imageProvider,
  onImageProviderChange,
  voiceProfiles = [],
  selectedVoiceProfileId,
  isSavingVoiceProfileSelection = false,
  onVoiceProfileChange,
  voiceProfileEmptyLabel = '잡 기본 보이스 사용',
}: ContentJobDetailSceneAssetCellProps) {
  const { status, previewUrl, cdnBlocked, workHint } = slice;
  const [expandedImage, setExpandedImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const canExpandMainImage = kind === 'image' && Boolean(previewUrl) && !cdnBlocked;

  return (
    <>
      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{modalityStatusLabel(status)}</span>
        </div>
        {canExpandMainImage ? (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => setExpandedImage({ url: previewUrl ?? '', title: `${title} 확대 보기` })}
          >
            <ContentJobDetailSceneAssetPreview
              kind={kind}
              previewUrl={previewUrl}
              cdnBlocked={cdnBlocked}
              status={status}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">클릭하여 확대</p>
          </button>
        ) : (
          <ContentJobDetailSceneAssetPreview
            kind={kind}
            previewUrl={previewUrl}
            cdnBlocked={cdnBlocked}
            status={status}
          />
        )}
        {workHint ? (
          <p
            className={cn(
              'text-xs',
              status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {workHint}
          </p>
        ) : null}
        {kind === 'image' && imageCandidates && imageCandidates.length > 0 ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-background/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                생성 이력 {imageCandidates.length}개
              </span>
              <span className="text-[11px] text-muted-foreground">마지막 생성본이 기본 선택됨</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {imageCandidates.map((candidate, index) => {
                const candidatePreviewUrl = candidate.previewUrl;

                return (
                  <div
                    key={candidate.candidateId}
                    className={cn(
                      'space-y-2 rounded-md border p-2',
                      candidate.selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background',
                    )}
                  >
                    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
                      {candidatePreviewUrl ? (
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() =>
                          setExpandedImage({
                            url: candidatePreviewUrl,
                            title: `이미지 버전 ${imageCandidates.length - index} 확대 보기`,
                          })
                        }
                      >
                        <img
                          src={candidatePreviewUrl}
                          alt=""
                          className="h-28 w-full object-contain"
                        />
                      </button>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">
                          버전 {imageCandidates.length - index}
                        </span>
                        {candidate.selected ? (
                          <span className="text-[11px] font-medium text-primary">선택됨</span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(candidate.createdAt).toLocaleString()}
                      </p>
                      {candidate.provider ? (
                        <p className="text-[11px] text-muted-foreground">{candidate.provider}</p>
                      ) : null}
                      {candidatePreviewUrl ? (
                        <p className="text-[11px] text-muted-foreground">썸네일 클릭 시 확대</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={candidate.selected ? 'default' : 'outline'}
                      className="w-full"
                      disabled={disabled || isSelectingImageCandidate || candidate.selected}
                      onClick={() => onSelectImageCandidate?.(candidate.candidateId)}
                    >
                      {candidate.selected ? '현재 선택본' : '이 이미지 사용'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {kind === 'voice' && voiceCandidates && voiceCandidates.length > 0 ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-background/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                생성 이력 {voiceCandidates.length}개
              </span>
              <span className="text-[11px] text-muted-foreground">마지막 생성본이 기본 선택됨</span>
            </div>
            <div className="grid gap-2">
              {voiceCandidates.map((candidate, index) => (
                <div
                  key={candidate.candidateId}
                  className={cn(
                    'space-y-2 rounded-md border p-2',
                    candidate.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background',
                  )}
                >
                  <ContentJobDetailSceneAssetPreview
                    kind="voice"
                    previewUrl={candidate.previewUrl}
                    cdnBlocked={candidate.cdnBlocked}
                    status={candidate.selected ? 'READY' : 'PENDING'}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        버전 {voiceCandidates.length - index}
                      </span>
                      {candidate.selected ? (
                        <span className="text-[11px] font-medium text-primary">선택됨</span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(candidate.createdAt).toLocaleString()}
                    </p>
                    <p className="break-all text-[11px] text-muted-foreground">
                      {candidate.fileName}
                    </p>
                    {candidate.provider ? (
                      <p className="text-[11px] text-muted-foreground">{candidate.provider}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={candidate.selected ? 'default' : 'outline'}
                    className="w-full"
                    disabled={disabled || isSelectingImageCandidate || candidate.selected}
                    onClick={() => onSelectVoiceCandidate?.(candidate.candidateId)}
                  >
                    {candidate.selected ? '현재 선택본' : '이 음성 사용'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {kind === 'image' ? (
          <div className="flex gap-2">
            <ContentJobDetailImageModelSelect
              value={imageProvider ?? 'OPENAI'}
              disabled={disabled || isSelectingImageCandidate}
              onChange={(value) => onImageProviderChange?.(value)}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              disabled={disabled || isSelectingImageCandidate}
              onClick={onRegenerate}
            >
              재생성
            </Button>
          </div>
        ) : kind === 'voice' ? (
          <div className="space-y-2">
            <ContentJobDetailVoiceProfileSelect
              voiceProfiles={voiceProfiles}
              value={selectedVoiceProfileId}
              disabled={disabled || isSavingVoiceProfileSelection}
              emptyLabel={voiceProfileEmptyLabel}
              onChange={onVoiceProfileChange ?? (() => undefined)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={disabled || isSelectingImageCandidate || isSavingVoiceProfileSelection}
              onClick={() => onRegenerate()}
            >
              재생성
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={disabled || isSelectingImageCandidate}
            onClick={() => onRegenerate()}
          >
            재생성
          </Button>
        )}
      </div>
      <SimpleModal
        open={Boolean(expandedImage)}
        title={expandedImage?.title ?? '이미지 확대 보기'}
        onClose={() => setExpandedImage(null)}
        panelClassName="max-w-5xl p-4"
      >
        {expandedImage ? (
          <div className="space-y-3">
            <img
              src={expandedImage.url}
              alt=""
              className="max-h-[80vh] w-full rounded-md border border-border bg-background object-contain"
            />
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setExpandedImage(null)}>
                닫기
              </Button>
            </div>
          </div>
        ) : null}
      </SimpleModal>
    </>
  );
}
