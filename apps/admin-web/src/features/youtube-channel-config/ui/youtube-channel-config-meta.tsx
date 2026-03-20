import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

type YoutubeChannelConfigMetaProps = {
  config?: YoutubeChannelConfig;
};

export function YoutubeChannelConfigMeta({ config }: YoutubeChannelConfigMetaProps) {
  if (config) {
    return (
      <p className="text-xs text-muted-foreground">
        Source: {config.source} / Last updated: {config.updatedAt || '-'} by {config.updatedBy}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      새 channelId를 추가하면 DB 기반으로 YouTube 시크릿 매핑을 바로 관리할 수 있습니다.
    </p>
  );
}
