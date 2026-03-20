import {
  type YoutubeChannelConfig,
  useDeleteYoutubeChannelConfigMutation,
  useUpsertYoutubeChannelConfigMutation,
  useYoutubeChannelConfigsQuery,
} from '@packages/graphql';

export type { YoutubeChannelConfig };

export const useDeleteYoutubeChannelConfig = useDeleteYoutubeChannelConfigMutation;
export const useUpsertYoutubeChannelConfig = useUpsertYoutubeChannelConfigMutation;
export const useYoutubeChannelConfigs = useYoutubeChannelConfigsQuery;
