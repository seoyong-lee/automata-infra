import { randomUUID } from "node:crypto";

import {
  agentRunSchema,
  type AgentKind,
  type AgentRun,
  type AgentRunStatus,
  type AgentRunTrigger,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { batchGetItems, getItem, putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const runPk = (id: string): string => `AGENT_RUN#${id}`;
const linkPrefix = "AGENT_RUN#";

export type AgentRunRow = AgentRun & {
  PK: string;
  SK: "META";
  createdAt: string;
  updatedAt: string;
};

type AgentRunLinkRow = {
  PK: string;
  SK: string;
  agentRunId: string;
  contentId: string;
  createdAt: string;
};

export const createAgentRun = async (input: {
  contentId: string | null;
  agentKind: AgentKind;
  trigger: AgentRunTrigger;
  inputRef: Record<string, unknown>;
  outputRef?: Record<string, unknown>;
  modelId?: string;
  tokenUsage?: AgentRun["tokenUsage"];
  status: AgentRunStatus;
  error?: string;
}): Promise<AgentRunRow> => {
  const id = `arun_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = agentRunSchema.parse({
    id,
    contentId: input.contentId,
    agentKind: input.agentKind,
    trigger: input.trigger,
    inputRef: input.inputRef,
    outputRef: input.outputRef,
    modelId: input.modelId,
    tokenUsage: input.tokenUsage,
    status: input.status,
    error: input.error,
  });
  const row: AgentRunRow = {
    ...parsed,
    PK: runPk(id),
    SK: "META",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  if (input.contentId) {
    const link: AgentRunLinkRow = {
      PK: contentPk(input.contentId),
      SK: `${linkPrefix}${now}#${id}`,
      agentRunId: id,
      contentId: input.contentId,
      createdAt: now,
    };
    await putItem(link as unknown as Record<string, unknown>);
  }
  return row;
};

export const getAgentRun = async (
  agentRunId: string,
): Promise<AgentRunRow | null> => {
  return getItem<AgentRunRow>({
    PK: runPk(agentRunId),
    SK: "META",
  });
};

export const listAgentRunsForChannel = async (
  channelId: string,
  limit = 50,
): Promise<AgentRunRow[]> => {
  const links = await queryItems<AgentRunLinkRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": linkPrefix,
    },
    scanIndexForward: false,
    limit,
  });
  const keys = links.map((link) => ({
    PK: runPk(link.agentRunId),
    SK: "META" as const,
  }));
  const batch = await batchGetItems<AgentRunRow>(keys);
  const rows = batch.filter((r): r is AgentRunRow => r !== null);
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};
