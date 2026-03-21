import type { AdminContent } from '@packages/graphql';

import type { LlmStepSettings } from '@/entities/llm-step';

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
  contents: AdminContent[];
  channelSummary: ChannelSummary;
};

export function SettingsSectionContent({
  activeSection,
  items,
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
