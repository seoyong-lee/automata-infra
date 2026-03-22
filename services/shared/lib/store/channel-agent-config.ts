import {
  channelAgentConfigPayloadSchema,
  channelAutomationFlagsSchema,
  defaultChannelAutomationFlags,
  scoutPolicySchema,
  type ChannelAgentConfigPayload,
  type ScoutPolicy,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { contentPk } from "./video-jobs";
import { getItem, putItem } from "../aws/runtime";

const sk = "AGENT_CONFIG" as const;

export type ChannelAgentConfigRow = {
  PK: string;
  SK: typeof sk;
  channelId: string;
  scoutPolicy: ScoutPolicy;
  automation: ChannelAgentConfigPayload["automation"];
  updatedAt: string;
};

const defaultScoutPolicy = (): ScoutPolicy =>
  scoutPolicySchema.parse({
    allowedTopics: [],
    blockedTopics: [],
    targetPlatforms: [],
    minIdeaScoreToCreateSource: 0.6,
  });

export const getChannelAgentConfig = async (
  channelId: string,
): Promise<ChannelAgentConfigRow | null> => {
  return getItem<ChannelAgentConfigRow>({
    PK: contentPk(channelId),
    SK: sk,
  });
};

export const putChannelAgentConfig = async (input: {
  channelId: string;
  scoutPolicy?: Partial<ScoutPolicy>;
  automation?: Partial<ChannelAgentConfigPayload["automation"]>;
}): Promise<ChannelAgentConfigRow> => {
  const existing = await getChannelAgentConfig(input.channelId);
  const now = new Date().toISOString();
  const mergedPolicy = scoutPolicySchema.parse({
    ...defaultScoutPolicy(),
    ...existing?.scoutPolicy,
    ...input.scoutPolicy,
  });
  const mergedAutomation = {
    ...defaultChannelAutomationFlags(),
    ...existing?.automation,
    ...input.automation,
  };
  const payload = channelAgentConfigPayloadSchema.parse({
    scoutPolicy: mergedPolicy,
    automation: mergedAutomation,
  });
  const row: ChannelAgentConfigRow = {
    PK: contentPk(input.channelId),
    SK: sk,
    channelId: input.channelId,
    scoutPolicy: payload.scoutPolicy,
    automation: payload.automation,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

/** GraphQL 등: 저장 없이 기본값으로 채운 설정 */
export const getChannelAgentConfigOrDefaults = async (
  channelId: string,
): Promise<ChannelAgentConfigRow> => {
  const existing = await getChannelAgentConfig(channelId);
  if (existing) {
    return existing;
  }
  const now = new Date(0).toISOString();
  return {
    PK: contentPk(channelId),
    SK: sk,
    channelId,
    scoutPolicy: defaultScoutPolicy(),
    automation: defaultChannelAutomationFlags(),
    updatedAt: now,
  };
};

export const patchChannelAgentConfigFromJson = async (input: {
  channelId: string;
  scoutPolicyJson?: unknown;
  automationJson?: unknown;
}): Promise<ChannelAgentConfigRow> => {
  const scoutPatch =
    input.scoutPolicyJson !== undefined
      ? scoutPolicySchema.partial().parse(input.scoutPolicyJson)
      : undefined;
  const autoPatch =
    input.automationJson !== undefined
      ? channelAutomationFlagsSchema.partial().parse(input.automationJson)
      : undefined;
  return putChannelAgentConfig({
    channelId: input.channelId,
    scoutPolicy: scoutPatch,
    automation: autoPatch,
  });
};
