import { randomUUID } from "node:crypto";

import {
  channelSignalSchema,
  type ChannelSignal,
  type ExternalPlatform,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { getItem, putItem } from "../aws/runtime";

const signalPk = (id: string): string => `CHANNEL_SIGNAL#${id}`;

export type ChannelSignalRow = ChannelSignal & {
  PK: string;
  SK: "META";
  createdAt: string;
  updatedAt: string;
};

export const createChannelSignal = async (
  input: Omit<ChannelSignal, "id">,
): Promise<ChannelSignalRow> => {
  const id = `chsig_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = channelSignalSchema.parse({
    ...input,
    id,
  });
  const row: ChannelSignalRow = {
    ...parsed,
    PK: signalPk(id),
    SK: "META",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const getChannelSignal = async (
  id: string,
): Promise<ChannelSignalRow | null> => {
  return getItem<ChannelSignalRow>({
    PK: signalPk(id),
    SK: "META",
  });
};

export const buildExternalChannelPartitionKey = (input: {
  platform: ExternalPlatform;
  externalChannelId: string;
}): string => `EXT_CH#${input.platform}#${input.externalChannelId.trim()}`;
