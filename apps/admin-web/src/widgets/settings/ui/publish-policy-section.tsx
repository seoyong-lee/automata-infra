import type { AdminContent } from '@packages/graphql';

import { type ChannelSummary } from '../model';
import {
  SettingsSectionCard,
  SettingsSectionIntro,
  SettingsStatCard,
} from './settings-section-primitives';

type PublishPolicySectionProps = {
  contents: AdminContent[];
  channelSummary: ChannelSummary;
};

export function PublishPolicySection({ contents, channelSummary }: PublishPolicySectionProps) {
  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="게시"
        title="게시 기본값과 검수 개입 범위"
        description="채널별 기본 visibility, playlist, 자동 게시 여부를 확인합니다. 실제 출고 판단과 검수 흐름은 작업 화면에서 수행하고, 여기서는 글로벌 기본값의 편차를 줄이는 데 집중합니다."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="자동 게시"
          value={channelSummary.autoPublish}
          hint="자동 게시가 켜진 채널"
        />
        <SettingsStatCard
          label="수동 검수"
          value={channelSummary.total - channelSummary.autoPublish}
          hint="최종 확인을 더 강조하는 채널"
        />
        <SettingsStatCard
          label="플레이리스트"
          value={channelSummary.withPlaylist}
          hint="기본 playlist가 설정된 채널"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingsSectionCard title="자동 게시 정책">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>자동 게시 채널: {channelSummary.autoPublish}</p>
            <p>수동 검수 강조 채널: {channelSummary.total - channelSummary.autoPublish}</p>
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="공개 범위 기본값" className="xl:col-span-2" tone="section">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
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
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="플레이리스트 연결">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>플레이리스트 설정 채널: {channelSummary.withPlaylist}</p>
            <p>플레이리스트 미설정 채널: {channelSummary.total - channelSummary.withPlaylist}</p>
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
