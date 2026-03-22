'use client';

import { useState } from 'react';

import { cn } from '@packages/ui';

import type { ModalityAssetStatus } from '../../lib/resolve-scene-asset-status';

type SceneAssetPreviewKind = 'image' | 'voice' | 'video';

type ContentJobDetailSceneAssetPreviewProps = {
  kind: SceneAssetPreviewKind;
  previewUrl?: string;
  cdnBlocked?: boolean;
  status: ModalityAssetStatus;
  size?: 'compact' | 'large';
};

export function ContentJobDetailSceneAssetPreview({
  kind,
  previewUrl,
  cdnBlocked,
  status,
  size = 'compact',
}: ContentJobDetailSceneAssetPreviewProps) {
  const [mediaBroken, setMediaBroken] = useState(false);

  const showMedia = Boolean(previewUrl) && !mediaBroken;
  const imageClassName =
    size === 'large' ? 'h-64 w-full object-contain md:h-80' : 'h-36 w-full object-contain';
  const videoClassName =
    size === 'large'
      ? 'aspect-[9/16] w-full max-h-[32rem] rounded-md border border-border bg-black'
      : 'aspect-[9/16] w-full max-h-48 rounded-md border border-border bg-black';

  if (cdnBlocked) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2 text-center text-xs text-amber-800 dark:text-amber-200',
          size === 'large' ? 'min-h-40 md:min-h-52' : 'min-h-22',
        )}
      >
        미리보기 CDN 미설정 ·{' '}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN</code>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-border bg-background px-2 text-center text-xs text-muted-foreground',
          size === 'large' ? 'min-h-40 md:min-h-52' : 'min-h-22',
        )}
      >
        {status === 'PENDING' ? '생성 후 미리보기가 표시됩니다.' : '미리보기 없음'}
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-background">
        {showMedia ? (
          <img
            src={previewUrl}
            alt=""
            className={imageClassName}
            onError={() => setMediaBroken(true)}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center text-xs text-muted-foreground',
              size === 'large' ? 'min-h-40 md:min-h-52' : 'min-h-22',
            )}
          >
            이미지를 불러오지 못했습니다.
          </div>
        )}
      </div>
    );
  }

  if (kind === 'voice') {
    return (
      <div className="space-y-1">
        {showMedia ? (
          <audio
            controls
            className="w-full"
            src={previewUrl}
            preload="metadata"
            onError={() => setMediaBroken(true)}
          />
        ) : (
          <div className="flex min-h-10 items-center text-xs text-muted-foreground">
            음성을 불러오지 못했습니다.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showMedia ? (
        <video
          controls
          className={videoClassName}
          src={previewUrl}
          preload="metadata"
          onError={() => setMediaBroken(true)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground',
            size === 'large' ? 'min-h-40 md:min-h-52' : 'min-h-22',
          )}
        >
          영상을 불러오지 못했습니다.
        </div>
      )}
      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-primary underline-offset-4 hover:underline"
      >
        새 탭에서 열기
      </a>
    </div>
  );
}
