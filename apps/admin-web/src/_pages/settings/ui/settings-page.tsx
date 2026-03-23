'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('settings.page');
  const settingsQuery = useLlmSettings();
  const voiceProfilesQuery = useVoiceProfiles();
  const contentsQuery = useAdminContents({ limit: 100 });
  const [activeSection, setActiveSection] = useState<SettingsSection>('models');
  const items = settingsQuery.data ?? [];
  const voiceProfiles = voiceProfilesQuery.data ?? [];
  const contents = contentsQuery.data?.items ?? [];
  const channelSummary = getChannelSummary(contents);
  const heroBySection: Record<SettingsSection, { eyebrow: string; title: string; subtitle: string }> = {
    general: {
      eyebrow: t('generalEyebrow'),
      title: t('generalTitle'),
      subtitle: t('generalSubtitle'),
    },
    channels: {
      eyebrow: t('generalEyebrow'),
      title: t('channelsTitle'),
      subtitle: t('channelsSubtitle'),
    },
    models: {
      eyebrow: t('generalEyebrow'),
      title: t('modelsTitle'),
      subtitle: t('modelsSubtitle'),
    },
    voices: {
      eyebrow: t('generalEyebrow'),
      title: t('voicesTitle'),
      subtitle: t('voicesSubtitle'),
    },
    providers: {
      eyebrow: t('generalEyebrow'),
      title: t('providersTitle'),
      subtitle: t('providersSubtitle'),
    },
    'publish-policy': {
      eyebrow: t('generalEyebrow'),
      title: t('publishPolicyTitle'),
      subtitle: t('publishPolicySubtitle'),
    },
    runtime: {
      eyebrow: t('generalEyebrow'),
      title: t('runtimeTitle'),
      subtitle: t('runtimeSubtitle'),
    },
  };
  const hero = heroBySection[activeSection];

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-10">
        <div className="space-y-4">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-admin-primary">
            {hero.eyebrow}
          </span>
          <AdminPageHeader title={hero.title} subtitle={hero.subtitle} />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-3">
          <SettingsSectionTabsCard
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className="mt-4 space-y-2">
            {settingsQuery.isLoading ? (
              <p className="text-sm text-admin-text-muted">{t('loadingDefaults')}</p>
            ) : null}
            {settingsQuery.error ? (
              <p className="text-sm text-destructive">
                {settingsQuery.error instanceof Error ? settingsQuery.error.message : t('failedDefaults')}
              </p>
            ) : null}
            {contentsQuery.isLoading ? (
              <p className="text-sm text-admin-text-muted">{t('loadingChannels')}</p>
            ) : null}
            {contentsQuery.error ? (
              <p className="text-sm text-destructive">
                {contentsQuery.error instanceof Error ? contentsQuery.error.message : t('failedChannels')}
              </p>
            ) : null}
          </div>
        </div>
        <div className="col-span-12 min-w-0 xl:col-span-9">
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
