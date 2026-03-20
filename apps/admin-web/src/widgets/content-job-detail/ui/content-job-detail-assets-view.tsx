'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

import { JobDraftDetail } from '../model';

type ContentJobDetailAssetsViewProps = {
  detail?: JobDraftDetail;
  error: unknown;
  readyAssetCount: number;
  isRunning: boolean;
  onRun: () => void;
};

export function ContentJobDetailAssetsView({
  detail,
  error,
  readyAssetCount,
  isRunning,
  onRun,
}: ContentJobDetailAssetsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Asset Coverage</p>
            <p className="mt-1 text-muted-foreground">
              {readyAssetCount}/{detail?.assets.length ?? 0} scenes have at least one generated
              asset
            </p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Render Path</p>
            <p className="mt-1 text-muted-foreground">
              scene package {'->'} asset validation {'->'} renderer {'->'} review/publish
            </p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Fallback Strategy</p>
            <p className="mt-1 text-muted-foreground">
              video fail {'->'} image fallback / TTS fail {'->'} alternate provider
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(detail?.assets ?? []).map((asset) => (
            <div key={asset.sceneId} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Scene {asset.sceneId}</p>
              <p className="mt-1 text-muted-foreground">
                image {asset.imageS3Key ? 'ready' : 'pending'} / video{' '}
                {asset.videoClipS3Key ? 'ready' : 'pending'} / voice{' '}
                {asset.voiceS3Key ? 'ready' : 'pending'}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isRunning} onClick={onRun}>
            {isRunning ? 'Generating...' : 'Run Asset Generation'}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      </CardContent>
    </Card>
  );
}
