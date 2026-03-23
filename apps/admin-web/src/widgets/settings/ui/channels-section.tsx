import type { AdminContent } from '@packages/graphql';
import Link from 'next/link';

import { ContentChannelSettingsCard } from '@/features/content-channel-settings';
import { SettingsSectionIntro, SettingsStatCard } from './settings-section-primitives';

type ChannelsSectionProps = {
  contents: AdminContent[];
};

export function ChannelsSection({ contents }: ChannelsSectionProps) {
  const autoPublishCount = contents.filter((content) => content.autoPublishEnabled).length;
  const playlistCount = contents.filter((content) => Boolean(content.playlistId?.trim())).length;

  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="채널"
        title="채널별 YouTube 연결과 게시 기본값"
        description={
          <>
            채널은{' '}
            <Link href="/content" className="font-medium text-admin-primary hover:underline">
              채널
            </Link>{' '}
            메뉴에서 추가하고, 이 섹션에서는 각 채널에 붙은 OAuth 시크릿 이름과 업로드 기본값만
            유지합니다. 민감한 시크릿 값 자체는 Secrets Manager에 두고 여기에는 식별자만 저장합니다.
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="카탈로그 채널"
          value={contents.length}
          hint="관리 중인 채널 카탈로그 항목"
        />
        <SettingsStatCard
          label="자동 게시"
          value={autoPublishCount}
          hint="렌더 후 자동 게시 기본값이 켜진 채널"
        />
        <SettingsStatCard
          label="플레이리스트"
          value={playlistCount}
          hint="업로드 기본 playlist가 있는 채널"
        />
      </div>

      <div className="grid gap-6">
        {contents.map((c) => (
          <ContentChannelSettingsCard key={c.contentId} content={c} />
        ))}
      </div>
    </div>
  );
}
