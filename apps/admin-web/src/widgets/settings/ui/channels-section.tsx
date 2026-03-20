import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { YoutubeChannelConfigCard } from '@/features/youtube-channel-config';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

type ChannelsSectionProps = {
  youtubeConfigs: YoutubeChannelConfig[];
};

export function ChannelsSection({ youtubeConfigs }: ChannelsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>YouTube Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>채널 ID별 YouTube OAuth secret 이름과 업로드 기본값을 DB에서 관리합니다.</p>
          <p>secret 자체는 Secrets Manager에 두고, 여기에는 secret name만 저장합니다.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {youtubeConfigs.map((config) => (
          <YoutubeChannelConfigCard key={config.channelId} config={config} />
        ))}
        <YoutubeChannelConfigCard />
      </div>
    </>
  );
}
