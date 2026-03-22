import type { ChannelSignal } from "../../../../lib/modules/agents/contracts/agent-domain";
import { createAgentRun } from "../../../shared/lib/store/agent-runs";
import { createChannelSignal } from "../../../shared/lib/store/channel-signals";
import { putChannelScoreSnapshot } from "../../../shared/lib/store/channel-score-snapshots";
import {
  getChannelWatchlistEntry,
  listChannelWatchlistForContent,
  type ChannelWatchlistRow,
} from "../../../shared/lib/store/channel-watchlist";
import { buildSnapshotPayloadFromSignal } from "./score-hit-channel";

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

const buildPlaceholderChannelSignal = (
  entry: ChannelWatchlistRow,
): Omit<ChannelSignal, "id"> => {
  const h = hashString(entry.externalChannelId);
  const p90 = 40_000 + (h % 900_000);
  const cadence = 2 + (h % 12);
  return {
    platform: entry.platform,
    externalChannelId: entry.externalChannelId,
    title: `External channel ${entry.externalChannelId.slice(0, 16)}`,
    stats: {
      subscriberCount: 10_000 + (h % 500_000),
      videoCount: 50 + (h % 200),
    },
    recentWindow: {
      sampledVideoCount: 12 + (h % 20),
      sampledShortCount: 2 + (h % 8),
      avgViews: p90 * 0.3,
      medianViews: p90 * 0.15,
      p90Views: p90,
      uploadCadencePerWeek: cadence,
    },
    fetchedAt: new Date().toISOString(),
    rawPayload: { placeholder: true },
  };
};

type ParsedBody = {
  contentId?: string;
  watchlistId?: string;
  maxChannels: number;
  dryRun: boolean;
};

const sliceBody = (rawBody: string) => rawBody.slice(0, 8000);

const parseChannelEvaluatorBody = (rawBody: string): ParsedBody => {
  let contentId: string | undefined;
  let watchlistId: string | undefined;
  let maxChannels = 8;
  let dryRun = false;
  try {
    const p = JSON.parse(rawBody) as Record<string, unknown>;
    if (typeof p.contentId === "string" && p.contentId.trim()) {
      contentId = p.contentId.trim();
    }
    if (typeof p.watchlistId === "string" && p.watchlistId.trim()) {
      watchlistId = p.watchlistId.trim();
    }
    if (typeof p.maxChannels === "number" && Number.isFinite(p.maxChannels)) {
      maxChannels = Math.min(50, Math.max(1, Math.floor(p.maxChannels)));
    }
    dryRun = Boolean(p.dryRun);
  } catch {
    // non-JSON
  }
  return { contentId, watchlistId, maxChannels, dryRun };
};

const loadWatchlistEntries = async (
  parsed: ParsedBody,
): Promise<ChannelWatchlistRow[]> => {
  const { contentId, watchlistId, maxChannels } = parsed;
  if (watchlistId) {
    const e = await getChannelWatchlistEntry(watchlistId);
    return e ? [e] : [];
  }
  if (contentId) {
    const list = await listChannelWatchlistForContent(contentId);
    return list.filter((x) => x.status === "WATCHING").slice(0, maxChannels);
  }
  return [];
};

const evaluateWatchlistEntries = async (
  entries: ChannelWatchlistRow[],
): Promise<{
  channelSignalIds: string[];
  channelScoreSnapshotIds: string[];
}> => {
  const channelSignalIds: string[] = [];
  const channelScoreSnapshotIds: string[] = [];
  for (const entry of entries) {
    const signalInput = buildPlaceholderChannelSignal(entry);
    const sigRow = await createChannelSignal(signalInput);
    channelSignalIds.push(sigRow.id);
    const payload = buildSnapshotPayloadFromSignal({
      signal: sigRow,
      contentId: entry.contentId,
    });
    const snap = await putChannelScoreSnapshot(payload);
    channelScoreSnapshotIds.push(snap.id);
  }
  return { channelSignalIds, channelScoreSnapshotIds };
};

/**
 * SQS 본문 JSON 예: `{ "contentId": "...", "maxChannels"?: number }` 또는 `{ "watchlistId": "..." }`
 */
export const runChannelEvaluatorSqsMessage = async (rawBody: string) => {
  const parsed = parseChannelEvaluatorBody(rawBody);
  const { contentId, watchlistId, dryRun } = parsed;

  if (!contentId && !watchlistId) {
    await createAgentRun({
      contentId: null,
      agentKind: "CHANNEL_EVALUATOR",
      trigger: "SQS",
      inputRef: { body: sliceBody(rawBody) },
      outputRef: { error: "missing contentId or watchlistId" },
      status: "FAILED",
      error: "missing contentId or watchlistId",
    });
    return;
  }

  if (dryRun) {
    await createAgentRun({
      contentId: contentId ?? null,
      agentKind: "CHANNEL_EVALUATOR",
      trigger: "SQS",
      inputRef: { body: sliceBody(rawBody) },
      outputRef: {
        note: "dry-run: no ChannelSignal / ChannelScoreSnapshot writes",
      },
      status: "SUCCEEDED",
    });
    return;
  }

  const entries = await loadWatchlistEntries(parsed);
  if (entries.length === 0) {
    await createAgentRun({
      contentId: contentId ?? null,
      agentKind: "CHANNEL_EVALUATOR",
      trigger: "SQS",
      inputRef: { body: sliceBody(rawBody), watchlistId, contentId },
      outputRef: { note: "no watchlist entries to evaluate" },
      status: "SKIPPED",
    });
    return;
  }

  const { channelSignalIds, channelScoreSnapshotIds } =
    await evaluateWatchlistEntries(entries);

  await createAgentRun({
    contentId: contentId ?? entries[0]?.contentId ?? null,
    agentKind: "CHANNEL_EVALUATOR",
    trigger: "SQS",
    inputRef: {
      body: sliceBody(rawBody),
      watchlistId,
      contentId,
    },
    outputRef: {
      channelSignalIds,
      channelScoreSnapshotIds,
      evaluatedChannels: entries.length,
    },
    status: "SUCCEEDED",
  });
};
