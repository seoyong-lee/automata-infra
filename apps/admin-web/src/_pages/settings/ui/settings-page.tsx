'use client';

import { useState } from 'react';

import {
  getChannelSummary,
  SettingsQueryStatus,
  SettingsSectionContent,
  SettingsSectionTabsCard,
  type SettingsSection,
} from '@/widgets/settings';
import { useLlmSettings } from '@/entities/llm-step';
import { useYoutubeChannelConfigs } from '@/entities/youtube-channel';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function SettingsPage() {
  const settingsQuery = useLlmSettings();
  const youtubeConfigsQuery = useYoutubeChannelConfigs();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const items = settingsQuery.data ?? [];
  const youtubeConfigs = youtubeConfigsQuery.data ?? [];
  const channelSummary = getChannelSummary(youtubeConfigs);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="설정"
        subtitle="콘텐츠 작업과 분리된 글로벌 영역입니다. 채널 연결, 모델·프롬프트, publish 기본값, 런타임 원칙을 관리합니다. 저장되지 않은 항목은 코드 기본값으로 동작합니다."
      />
      <SettingsSectionTabsCard activeSection={activeSection} onSectionChange={setActiveSection} />
      <SettingsQueryStatus
        settingsLoading={settingsQuery.isLoading}
        settingsError={settingsQuery.error}
        youtubeConfigsLoading={youtubeConfigsQuery.isLoading}
        youtubeConfigsError={youtubeConfigsQuery.error}
      />
      <SettingsSectionContent
        activeSection={activeSection}
        items={items}
        youtubeConfigs={youtubeConfigs}
        channelSummary={channelSummary}
      />
    </div>
  );
}
