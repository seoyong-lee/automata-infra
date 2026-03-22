import { createAgentRun } from "../../../shared/lib/store/agent-runs";

/**
 * SQS 메시지 1건 처리. 초기 구현은 수집기 없이 AgentRun 기록만 남긴다.
 * 본문 JSON: `{ "contentId"?: string, "dryRun"?: boolean, "manual"?: boolean }`
 */
export const runTrendScoutSqsMessage = async (rawBody: string) => {
  let contentId: string | null = null;
  let dryRun = false;
  let manual = false;
  try {
    const parsed = JSON.parse(rawBody) as {
      contentId?: string;
      dryRun?: boolean;
      manual?: boolean;
    };
    if (parsed.contentId?.trim()) {
      contentId = parsed.contentId.trim();
    }
    dryRun = Boolean(parsed.dryRun);
    manual = Boolean(parsed.manual);
  } catch {
    // non-JSON: treat whole body as opaque
  }

  const noteParts = [
    manual ? "manual enqueue (e.g. GraphQL)" : null,
    dryRun
      ? "dry-run: no TrendSignal/IdeaCandidate writes"
      : "placeholder: wire collectors + LLM in Milestone M2",
  ].filter(Boolean);

  await createAgentRun({
    contentId,
    agentKind: "SCOUT",
    trigger: "SQS",
    inputRef: { body: rawBody.slice(0, 8000) },
    outputRef: {
      note: noteParts.join(" | "),
    },
    status: "SUCCEEDED",
  });
};
