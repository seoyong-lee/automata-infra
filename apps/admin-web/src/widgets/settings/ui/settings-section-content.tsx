import type { AdminContent } from '@packages/graphql';

import type { LlmStepSettings } from '@/entities/llm-step';
import type { VoiceProfile } from '@/entities/voice-profile';

import { type ChannelSummary, type SettingsSection } from '../model';
import { ChannelsSection } from './channels-section';
import { GeneralSection } from './general-section';
import { ModelsSection } from './models-section';
import { ProvidersSection } from './providers-section';
import { PublishPolicySection } from './publish-policy-section';
import { RuntimeSection } from './runtime-section';
import { VoicesSection } from './voices-section';

type SettingsSectionContentProps = {
  activeSection: SettingsSection;
  items: LlmStepSettings[];
  voiceProfiles: VoiceProfile[];
  contents: AdminContent[];
  channelSummary: ChannelSummary;
};

export function SettingsSectionContent({
  activeSection,
  items,
  voiceProfiles,
  contents,
  channelSummary,
}: SettingsSectionContentProps) {
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
