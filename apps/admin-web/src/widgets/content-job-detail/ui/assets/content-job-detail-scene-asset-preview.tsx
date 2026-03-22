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
};

export function ContentJobDetailSceneAssetPreview({
  kind,
  previewUrl,
  cdnBlocked,
  status,
}: ContentJobDetailSceneAssetPreviewProps) {
  const [mediaBroken, setMediaBroken] = useState(false);

  const showMedia = Boolean(previewUrl) && !mediaBroken;

  if (cdnBlocked) {
    return (
      <div className="flex min-h-22 items-center justify-center rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2 text-center text-xs text-amber-800 dark:text-amber-200">
        미리보기 CDN 미설정 ·{' '}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN</code>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div
        className={cn(
          'flex min-h-22 items-center justify-center rounded-md border border-dashed border-border bg-background px-2 text-center text-xs text-muted-foreground',
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
            className="max-h-28 w-full object-contain"
            onError={() => setMediaBroken(true)}
          />
        ) : (
          <div className="flex min-h-22 items-center justify-center text-xs text-muted-foreground">
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
          className="max-h-32 w-full rounded-md border border-border bg-black"
          src={previewUrl}
          preload="metadata"
          onError={() => setMediaBroken(true)}
        />
      ) : (
        <div className="flex min-h-22 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
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
