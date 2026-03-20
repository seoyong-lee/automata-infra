'use client';

import { useState } from 'react';

import { getChannelSummary, type SettingsSection } from '@/widgets/settings';
import {
  SettingsOverviewCard,
  SettingsQueryStatus,
  SettingsSectionContent,
  SettingsSectionTabsCard,
} from '@/widgets/settings';
import { useLlmSettings } from '@/entities/llm-step';
import { useYoutubeChannelConfigs } from '@/entities/youtube-channel';

export function SettingsPage() {
  const settingsQuery = useLlmSettings();
  const youtubeConfigsQuery = useYoutubeChannelConfigs();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const items = settingsQuery.data ?? [];
  const youtubeConfigs = youtubeConfigsQuery.data ?? [];
  const channelSummary = getChannelSummary(youtubeConfigs);

  return (
    <div className="space-y-6">
      <SettingsOverviewCard />
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
