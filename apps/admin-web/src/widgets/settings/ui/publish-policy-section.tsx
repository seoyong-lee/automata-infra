import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import type { AdminContent } from '@packages/graphql';

import { type ChannelSummary } from '../model';

type PublishPolicySectionProps = {
  contents: AdminContent[];
  channelSummary: ChannelSummary;
};

export function PublishPolicySection({ contents, channelSummary }: PublishPolicySectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Auto Publish Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Auto publish enabled: {channelSummary.autoPublish}</p>
          <p>Manual review emphasis: {channelSummary.total - channelSummary.autoPublish}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Visibility Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {contents.length === 0 ? (
            <p>등록된 채널이 없습니다.</p>
          ) : (
            contents.map((c) => (
              <p key={c.contentId}>
                <span className="font-mono text-xs">{c.contentId}</span> · {c.label}:{' '}
                {c.defaultVisibility ?? 'unset'}
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
          <p>Playlist configured: {channelSummary.withPlaylist}</p>
          <p>Playlist missing: {channelSummary.total - channelSummary.withPlaylist}</p>
        </CardContent>
      </Card>
    </div>
  );
}
