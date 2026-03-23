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
  const [activeSection, setActiveSection] = useState<SettingsSection>('models');
  const items = settingsQuery.data ?? [];
  const voiceProfiles = voiceProfilesQuery.data ?? [];
  const contents = contentsQuery.data?.items ?? [];
  const channelSummary = getChannelSummary(contents);
  const heroBySection: Record<SettingsSection, { eyebrow: string; title: string; subtitle: string }> = {
    general: {
      eyebrow: 'Global Configuration',
      title: 'General',
      subtitle:
        'Review the global policy layer, workspace coverage, and operational boundaries for the Admin console.',
    },
    channels: {
      eyebrow: 'Global Configuration',
      title: 'Channels',
      subtitle:
        'Manage YouTube connection defaults, publishing metadata, and automation rules for each content channel.',
    },
    models: {
      eyebrow: 'Global Configuration',
      title: 'Models & Prompts',
      subtitle:
        'Configure the core intelligence layer of Automata Studio. Define model parameters, prompt engineering strategies, and orchestrate how different stages of the pipeline interact with LLMs.',
    },
    voices: {
      eyebrow: 'Global Configuration',
      title: 'Voices',
      subtitle:
        'Manage reusable TTS voice profiles, tuning presets, and playback references for production use.',
    },
    providers: {
      eyebrow: 'Global Configuration',
      title: 'Providers',
      subtitle:
        'Review provider ownership, secret boundaries, and fallback responsibilities for external integrations.',
    },
    'publish-policy': {
      eyebrow: 'Global Configuration',
      title: 'Publish Policy',
      subtitle:
        'Review publishing visibility defaults, playlist coverage, and automation safeguards before release.',
    },
    runtime: {
      eyebrow: 'Global Configuration',
      title: 'Runtime',
      subtitle:
        'Track retry, fallback, and runtime control principles that shape how the workspace behaves in production.',
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
