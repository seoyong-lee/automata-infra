'use client';

import { useState } from 'react';

import { type AdminContent, useAdminContents } from '@/entities/admin-content';
import { type LlmStepSettings, useLlmSettings } from '@/entities/llm-step';
import { type VoiceProfile, useVoiceProfiles } from '@/entities/voice-profile';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';
import {
  type ChannelSummary,
  getChannelSummary,
  type SettingsSection,
} from '@/widgets/settings/model';
import { ChannelsSection } from '@/widgets/settings/ui/channels-section';
import { GeneralSection } from '@/widgets/settings/ui/general-section';
import { ModelsSection } from '@/widgets/settings/ui/models-section';
import { ProvidersSection } from '@/widgets/settings/ui/providers-section';
import { PublishPolicySection } from '@/widgets/settings/ui/publish-policy-section';
import { RuntimeSection } from '@/widgets/settings/ui/runtime-section';
import { SettingsSectionTabsCard } from '@/widgets/settings/ui/settings-section-tabs-card';
import { VoicesSection } from '@/widgets/settings/ui/voices-section';

type SettingsSectionBodyProps = {
  activeSection: SettingsSection;
  items: LlmStepSettings[];
  voiceProfiles: VoiceProfile[];
  contents: AdminContent[];
  channelSummary: ChannelSummary;
};

function SettingsSectionBody({
  activeSection,
  items,
  voiceProfiles,
  contents,
  channelSummary,
}: SettingsSectionBodyProps) {
  switch (activeSection) {
    case 'general':
      return <GeneralSection items={items} channelSummary={channelSummary} />;
    case 'channels':
      return <ChannelsSection contents={contents} />;
    case 'models':
      return <ModelsSection items={items} />;
    case 'voices':
      return <VoicesSection voiceProfiles={voiceProfiles} />;
    case 'providers':
      return <ProvidersSection items={items} />;
    case 'publish-policy':
      return <PublishPolicySection contents={contents} channelSummary={channelSummary} />;
    case 'runtime':
      return <RuntimeSection />;
    default:
      return null;
  }
}

export function SettingsPage() {
  const settingsQuery = useLlmSettings();
  const voiceProfilesQuery = useVoiceProfiles();
  const contentsQuery = useAdminContents({ limit: 100 });
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const items = settingsQuery.data ?? [];
  const voiceProfiles = voiceProfilesQuery.data ?? [];
  const contents = contentsQuery.data?.items ?? [];
  const channelSummary = getChannelSummary(contents);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="설정"
        subtitle="채널·제작 아이템 작업과 분리된 글로벌 영역입니다. 채널 연결, 모델·프롬프트, publish 기본값, 런타임 원칙을 관리합니다. 저장되지 않은 항목은 코드 기본값으로 동작합니다."
      />
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SettingsSectionTabsCard
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          {settingsQuery.isLoading ? (
            <p className="text-sm text-admin-text-muted">설정 기본값을 불러오는 중…</p>
          ) : null}
          {settingsQuery.error ? (
            <p className="text-sm text-destructive">
              {settingsQuery.error instanceof Error
                ? settingsQuery.error.message
                : '설정을 불러오지 못했습니다.'}
            </p>
          ) : null}
          {contentsQuery.isLoading ? (
            <p className="text-sm text-admin-text-muted">채널 목록을 불러오는 중…</p>
          ) : null}
          {contentsQuery.error ? (
            <p className="text-sm text-destructive">
              {contentsQuery.error instanceof Error
                ? contentsQuery.error.message
                : '채널 목록을 불러오지 못했습니다.'}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <SettingsSectionBody
            activeSection={activeSection}
            items={items}
            voiceProfiles={voiceProfiles}
            contents={contents}
            channelSummary={channelSummary}
          />
        </div>
      </div>
    </div>
  );
}
