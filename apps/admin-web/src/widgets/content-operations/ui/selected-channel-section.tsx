'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { SelectedChannelSectionProps } from '../model';

export function SelectedChannelSection({
  selectedChannel,
  selectedChannelConfig,
}: SelectedChannelSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Channel</CardTitle>
        <CardDescription>
          채널은 배포 컨테이너입니다. 업로드 기본 정책과 현재 선택된 운영 맥락을 먼저 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">{selectedChannel || '-'}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Auto publish</p>
              <p>{selectedChannelConfig?.autoPublishEnabled ? 'enabled' : 'review first'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visibility</p>
              <p>{selectedChannelConfig?.defaultVisibility ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Playlist</p>
              <p>{selectedChannelConfig?.playlistId ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Secret</p>
              <p>{selectedChannelConfig?.youtubeSecretName ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          이 채널 안에서 콘텐츠 라인을 탭처럼 선택하고, 그 내부에서 개별 잡과 업로드 흐름을
          운영합니다.
        </div>
      </CardContent>
    </Card>
  );
}
