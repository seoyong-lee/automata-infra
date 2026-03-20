'use client';

import type { SelectedChannelSectionProps } from '../model';

export function SelectedChannelSection({
  selectedChannel,
  selectedChannelConfig,
}: SelectedChannelSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">선택한 채널</h3>
        <p className="text-sm text-muted-foreground">
          배포·업로드 기본 정책이 적용되는 컨테이너입니다.
        </p>
      </div>
      <div className="rounded-lg border border-border/80 p-4 text-sm">
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
    </section>
  );
}
