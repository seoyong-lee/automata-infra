import type { YoutubeChannelConfig } from '@/entities/youtube-channel';
import { withStringFallback, withBooleanFallback, toNumberFieldValue } from '@/shared/lib/form';
import { YoutubeChannelConfigForm } from '../model/form';

export const toYoutubeChannelConfigForm = (
  config?: YoutubeChannelConfig,
): YoutubeChannelConfigForm => {
  return {
    channelId: withStringFallback(config?.channelId),
    youtubeSecretName: withStringFallback(config?.youtubeSecretName),
    youtubeAccountType: withStringFallback(config?.youtubeAccountType),
    autoPublishEnabled: withBooleanFallback(config?.autoPublishEnabled),
    defaultVisibility: withStringFallback(
      config?.defaultVisibility,
      'private',
    ) as YoutubeChannelConfigForm['defaultVisibility'],
    defaultCategoryId: toNumberFieldValue(config?.defaultCategoryId, '22'),
    playlistId: withStringFallback(config?.playlistId),
  };
};
