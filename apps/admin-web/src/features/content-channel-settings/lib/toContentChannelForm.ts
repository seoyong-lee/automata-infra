import type { AdminContent } from '@packages/graphql';

import { withStringFallback, withBooleanFallback, toNumberFieldValue } from '@/shared/lib/form';

import { type ContentChannelForm } from '../model/form';

export const toContentChannelForm = (content: AdminContent): ContentChannelForm => {
  return {
    label: withStringFallback(content.label),
    youtubeSecretName: withStringFallback(content.youtubeSecretName ?? undefined),
    youtubeAccountType: withStringFallback(content.youtubeAccountType ?? undefined),
    autoPublishEnabled: withBooleanFallback(content.autoPublishEnabled),
    defaultVisibility: withStringFallback(
      content.defaultVisibility ?? undefined,
      'private',
    ) as ContentChannelForm['defaultVisibility'],
    defaultCategoryId: toNumberFieldValue(content.defaultCategoryId ?? undefined, ''),
    playlistId: withStringFallback(content.playlistId ?? undefined),
  };
};
