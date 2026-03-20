import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import type { YoutubeChannelConfig } from '@/entities/youtube-channel';
import { type ChannelSummary } from '../model';

type PublishPolicySectionProps = {
  youtubeConfigs: YoutubeChannelConfig[];
  channelSummary: ChannelSummary;
};

export function PublishPolicySection({
  youtubeConfigs,
  channelSummary,
}: PublishPolicySectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Auto Publish Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Auto publish enabled channels: {channelSummary.autoPublish}</p>
          <p>Manual review channels: {channelSummary.total - channelSummary.autoPublish}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Visibility Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {youtubeConfigs.length === 0 ? (
            <p>채널 설정이 아직 없습니다.</p>
          ) : (
            youtubeConfigs.map((config) => (
              <p key={config.channelId}>
                {config.channelId}: {config.defaultVisibility ?? 'unset'}
              </p>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Playlist Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Playlist configured channels: {channelSummary.withPlaylist}</p>
          <p>Playlist missing channels: {channelSummary.total - channelSummary.withPlaylist}</p>
        </CardContent>
      </Card>
    </div>
  );
}
