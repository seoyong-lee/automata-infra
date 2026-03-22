'use client';

import { Button } from '@packages/ui/button';

import { modalityStatusLabel } from '../../lib/resolve-scene-asset-status';
import type { ModalityAssetStatus } from '../../lib/resolve-scene-asset-status';

type ContentJobDetailSceneAssetCellProps = {
  title: string;
  status: ModalityAssetStatus;
  onRegenerate: () => void;
  disabled: boolean;
};

export function ContentJobDetailSceneAssetCell({
  title,
  status,
  onRegenerate,
  disabled,
}: ContentJobDetailSceneAssetCellProps) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{modalityStatusLabel(status)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {status === 'READY'
          ? '생성된 자산이 있습니다.'
          : status === 'PENDING'
            ? '이번 실행에서 채워질 수 있습니다.'
            : '아직 자산이 없습니다.'}
      </p>
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
