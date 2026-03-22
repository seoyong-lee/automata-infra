'use client';

import { Button } from '@packages/ui/button';
import { cn } from '@packages/ui';

import { modalityStatusLabel } from '../../lib/resolve-scene-asset-status';
import type { SceneAssetModalitySlice } from '../../model/job-detail-scene-assets';
import { ContentJobDetailSceneAssetPreview } from './content-job-detail-scene-asset-preview';

type SceneAssetCellKind = 'image' | 'voice' | 'video';

type ContentJobDetailSceneAssetCellProps = {
  kind: SceneAssetCellKind;
  title: string;
  slice: SceneAssetModalitySlice;
  onRegenerate: () => void;
  disabled: boolean;
};

export function ContentJobDetailSceneAssetCell({
  kind,
  title,
  slice,
  onRegenerate,
  disabled,
}: ContentJobDetailSceneAssetCellProps) {
  const { status, previewUrl, cdnBlocked, workHint } = slice;

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{modalityStatusLabel(status)}</span>
      </div>
      <ContentJobDetailSceneAssetPreview
        kind={kind}
        previewUrl={previewUrl}
        cdnBlocked={cdnBlocked}
        status={status}
      />
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
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={disabled}
        onClick={onRegenerate}
      >
        재생성
      </Button>
    </div>
  );
}
