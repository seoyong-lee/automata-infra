import type { LlmStepSettings } from '@/entities/llm-step';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

import { type ChannelSummary, type SettingsSection } from '../model';
import { ChannelsSection } from './channels-section';
import { GeneralSection } from './general-section';
import { ModelsSection } from './models-section';
import { ProvidersSection } from './providers-section';
import { PublishPolicySection } from './publish-policy-section';
import { RuntimeSection } from './runtime-section';

type SettingsSectionContentProps = {
  activeSection: SettingsSection;
  items: LlmStepSettings[];
  youtubeConfigs: YoutubeChannelConfig[];
  channelSummary: ChannelSummary;
};

export function SettingsSectionContent({
  activeSection,
  items,
  youtubeConfigs,
  channelSummary,
}: SettingsSectionContentProps) {
  switch (activeSection) {
    case 'general':
      return <GeneralSection items={items} channelSummary={channelSummary} />;
    case 'channels':
      return <ChannelsSection youtubeConfigs={youtubeConfigs} />;
    case 'models':
      return <ModelsSection items={items} />;
    case 'providers':
      return <ProvidersSection items={items} />;
    case 'publish-policy':
      return (
        <PublishPolicySection youtubeConfigs={youtubeConfigs} channelSummary={channelSummary} />
      );
    case 'runtime':
      return <RuntimeSection />;
    default:
      return null;
  }
}
