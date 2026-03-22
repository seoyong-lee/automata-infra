import type { SourceItemGql } from '@packages/graphql';

export type MergedRow = {
  channelId: string;
  channelLabel: string;
  source: SourceItemGql;
};
