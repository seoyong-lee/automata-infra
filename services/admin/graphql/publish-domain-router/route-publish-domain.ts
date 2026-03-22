import { z } from "zod";

import {
  contentPublishDraftSchema,
  platformPublishProfileSchema,
  type ContentPublishDraft,
  type PlatformPublishProfile,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import {
  createSourceItem,
  getSourceItem,
  listSourceItemsForChannel,
  updateSourceItem,
} from "../../../shared/lib/store/source-items";
import {
  getPlatformPublishProfile,
  putPlatformPublishProfile,
} from "../../../shared/lib/store/publish-profile-store";
import {
  getContentPublishDraft,
  putContentPublishDraft,
} from "../../../shared/lib/store/publish-draft-store";
import { listPublishTargetsByJob } from "../../../shared/lib/store/publish-targets-job";
import { upsertPersistedPlatformConnection } from "../../../shared/lib/store/platform-connection-records";
import { listAgentRunsForChannel } from "../../../shared/lib/store/agent-runs";
import {
  getChannelAgentConfigOrDefaults,
  patchChannelAgentConfigFromJson,
} from "../../../shared/lib/store/channel-agent-config";
import {
  getIdeaCandidate,
  listIdeaCandidatesForChannel,
  updateIdeaCandidate,
  type IdeaCandidateRow,
} from "../../../shared/lib/store/idea-candidates";
import {
  listPerformanceInsightsForJob,
  type PerformanceInsightRow,
} from "../../../shared/lib/store/performance-insights";
import {
  listTrendSignalsForChannel,
  type TrendSignalRow,
} from "../../../shared/lib/store/trend-signals";
import {
  createChannelWatchlistEntry,
  listChannelWatchlistForContent,
  updateChannelWatchlistEntry,
  type ChannelWatchlistRow,
} from "../../../shared/lib/store/channel-watchlist";
import {
  getLatestChannelScoreSnapshot,
  type ChannelScoreSnapshotRow,
} from "../../../shared/lib/store/channel-score-snapshots";
import {
  getJobMeta,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../shared/mapper/map-job-meta-to-admin-job";
import { runPublishOrchestrationUsecase } from "./usecase/run-publish-orchestration";
import { badUserInput } from "../shared/errors";
import {
  getOptionalEnv,
  sendSqsMessage,
} from "../../../shared/lib/aws/runtime";

const idArg = z.object({ id: z.string().trim().min(1) });
const channelArg = z.object({ channelId: z.string().trim().min(1) });
const jobArg = z.object({ jobId: z.string().trim().min(1) });

const createSourceItemInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    masterHook: z.string().optional(),
    sourceNotes: z.string().optional(),
  }),
});

const updateSourceItemInput = z.object({
  input: z.object({
    sourceItemId: z.string().trim().min(1),
    topic: z.string().optional(),
    masterHook: z.string().optional(),
    sourceNotes: z.string().optional(),
    status: z
      .enum(["IDEATING", "READY_FOR_DISTRIBUTION", "ARCHIVED"])
      .optional(),
  }),
});

const setJobSourceItemInput = z.object({
  input: z.object({
    jobId: z.string().trim().min(1),
    sourceItemId: z.string().trim().min(1),
  }),
});

const profileArgs = z.object({
  channelId: z.string().trim().min(1),
  platformConnectionId: z.string().trim().min(1),
});

const upsertPlatformConnectionInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    platformConnectionId: z.string().optional(),
    platform: z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM"]),
    accountId: z.string().trim().min(1),
    accountHandle: z.string().optional(),
    oauthAccountId: z.string().trim().min(1),
    status: z.enum(["CONNECTED", "EXPIRED", "ERROR", "DISCONNECTED"]),
  }),
});

const updatePlatformPublishProfileInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    platformConnectionId: z.string().trim().min(1),
    profile: z.record(z.string(), z.unknown()),
  }),
});

const updateContentPublishDraftInput = z.object({
  input: z.object({
    draft: z.unknown(),
  }),
});

const runPublishOrchestrationInput = z.object({
  input: z.object({
    jobId: z.string().trim().min(1),
  }),
});

const promoteIdeaCandidateInput = z.object({
  input: z.object({
    ideaCandidateId: z.string().trim().min(1),
  }),
});

const rejectIdeaCandidateInput = z.object({
  input: z.object({
    ideaCandidateId: z.string().trim().min(1),
  }),
});

const updateChannelAgentConfigInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    scoutPolicyJson: z.unknown().optional(),
    automationJson: z.unknown().optional(),
  }),
});

const createChannelWatchlistEntryInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    platform: z.enum(["YOUTUBE"]),
    externalChannelId: z.string().trim().min(1),
    source: z.enum(["AUTO_DISCOVERED", "MANUAL"]).optional(),
    priority: z.number().int().optional(),
  }),
});

const updateChannelWatchlistEntryInput = z.object({
  input: z.object({
    watchlistId: z.string().trim().min(1),
    status: z.enum(["WATCHING", "PAUSED", "ARCHIVED"]).optional(),
    priority: z.number().int().optional(),
  }),
});

const enqueueTrendScoutJobInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1).optional().nullable(),
    dryRun: z.boolean().optional(),
  }),
});

const agentRunsForChannelArgs = z.object({
  channelId: z.string().trim().min(1),
  limit: z.number().int().positive().max(200).optional(),
});

const mapSourceToGql = (row: Awaited<ReturnType<typeof getSourceItem>>) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    topic: row.topic,
    masterHook: row.masterHook ?? null,
    sourceNotes: row.sourceNotes ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

function mapYoutubeProfileSlice(yt: PlatformPublishProfile["youtube"]) {
  return {
    youtubeCategoryId: yt?.defaultCategoryId ?? null,
    youtubePlaylistIds: yt?.defaultPlaylistIds ?? [],
    youtubeTags: yt?.defaultTags ?? [],
  };
}

function mapPlatformPublishProfileToGql(p: PlatformPublishProfile) {
  const yt = p.youtube;
  const ig = p.instagram;
  const tt = p.tiktok;
  return {
    platformConnectionId: p.platformConnectionId,
    channelId: p.channelId,
    defaultVisibility: p.defaultVisibility ?? null,
    defaultLanguage: p.defaultLanguage ?? null,
    defaultHashtags: p.defaultHashtags,
    captionFooterTemplate: p.captionFooterTemplate ?? null,
    preferredSlots: p.preferredSlots ?? [],
    ...mapYoutubeProfileSlice(yt),
    tiktokDisclosureTemplate: tt?.disclosureTemplate ?? null,
    instagramFirstCommentTemplate: ig?.defaultFirstCommentTemplate ?? null,
  };
}

const mapContentPublishDraftToGql = (d: ContentPublishDraft) => ({
  channelContentItemId: d.channelContentItemId,
  globalDraft: d.globalDraft,
  platformDrafts: d.platformDrafts.map((p) => ({
    platform: p.platform,
    targetConnectionId: p.targetConnectionId,
    enabled: p.enabled,
    metadataJson: JSON.stringify(p.metadata),
    overrideFields: p.overrideFields ?? [],
    validationStatus: p.validationStatus ?? null,
  })),
});

async function handleSourceItem(rawArgs: Record<string, unknown>) {
  const { id } = idArg.parse(rawArgs);
  return mapSourceToGql(await getSourceItem(id));
}

async function handleSourceItemsForChannel(rawArgs: Record<string, unknown>) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listSourceItemsForChannel(channelId);
  return rows.map((r) => mapSourceToGql(r)!);
}

async function handleCreateSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = createSourceItemInput.parse(rawArgs);
  const row = await createSourceItem(input);
  return mapSourceToGql(row)!;
}

async function handleUpdateSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = updateSourceItemInput.parse(rawArgs);
  const row = await updateSourceItem(input);
  return mapSourceToGql(row)!;
}

async function handleSetJobSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = setJobSourceItemInput.parse(rawArgs);
  await updateJobMeta(input.jobId, { sourceItemId: input.sourceItemId });
  const next = await getJobMeta(input.jobId);
  if (!next) {
    throw badUserInput("job not found");
  }
  return mapJobMetaToAdminJob(next);
}

async function handlePlatformPublishProfile(rawArgs: Record<string, unknown>) {
  const { channelId, platformConnectionId } = profileArgs.parse(rawArgs);
  const p = await getPlatformPublishProfile(channelId, platformConnectionId);
  if (!p) {
    return null;
  }
  return mapPlatformPublishProfileToGql(p);
}

async function handleUpsertPlatformConnection(
  rawArgs: Record<string, unknown>,
) {
  const { input } = upsertPlatformConnectionInput.parse(rawArgs);
  const row = await upsertPersistedPlatformConnection(input);
  const { PK: _pk, SK: _sk, updatedAt: _u, ...rest } = row;
  return {
    platformConnectionId: rest.platformConnectionId,
    channelId: rest.channelId,
    platform: rest.platform,
    accountId: rest.accountId,
    accountHandle: rest.accountHandle ?? null,
    oauthAccountId: rest.oauthAccountId,
    status: rest.status,
    connectedAt: rest.connectedAt,
    lastSyncedAt: rest.lastSyncedAt ?? null,
  };
}

async function handleUpdatePlatformPublishProfile(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updatePlatformPublishProfileInput.parse(rawArgs);
  const merged = platformPublishProfileSchema.parse({
    ...(input.profile as Record<string, unknown>),
    platformConnectionId: input.platformConnectionId,
    channelId: input.channelId,
  });
  const saved = await putPlatformPublishProfile(merged);
  return mapPlatformPublishProfileToGql(saved);
}

async function handleContentPublishDraft(rawArgs: Record<string, unknown>) {
  const { jobId } = jobArg.parse(rawArgs);
  const d = await getContentPublishDraft(jobId);
  if (!d) {
    return null;
  }
  return mapContentPublishDraftToGql(d);
}

function parseContentPublishDraftInput(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw badUserInput("draft must be valid JSON");
    }
  }
  return raw as Record<string, unknown>;
}

async function handleUpdateContentPublishDraft(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updateContentPublishDraftInput.parse(rawArgs);
  const draft = contentPublishDraftSchema.parse(
    parseContentPublishDraftInput(input.draft),
  );
  const saved = await putContentPublishDraft(draft);
  return mapContentPublishDraftToGql(saved);
}

async function handlePublishTargetsForJob(rawArgs: Record<string, unknown>) {
  const { jobId } = jobArg.parse(rawArgs);
  const rows = await listPublishTargetsByJob(jobId);
  return rows.map((t) => ({
    publishTargetId: t.publishTargetId,
    channelContentItemId: t.channelContentItemId,
    platformConnectionId: t.platformConnectionId,
    platform: t.platform,
    status: t.status,
    scheduledAt: t.scheduledAt ?? null,
    externalPostId: t.externalPostId ?? null,
    externalUrl: t.externalUrl ?? null,
    publishError: t.publishError ?? null,
  }));
}

async function handleRunPublishOrchestration(rawArgs: Record<string, unknown>) {
  const { input } = runPublishOrchestrationInput.parse(rawArgs);
  return runPublishOrchestrationUsecase(input);
}

function mapIdeaCandidateToGql(row: IdeaCandidateRow) {
  return {
    id: row.id,
    contentId: row.contentId,
    trendSignalIds: row.trendSignalIds,
    title: row.title,
    hook: row.hook ?? null,
    rationale: row.rationale ?? null,
    score: row.score,
    status: row.status,
    promotedSourceItemId: row.promotedSourceItemId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTrendSignalToGql(row: TrendSignalRow) {
  return {
    id: row.id,
    contentId: row.contentId,
    sourceKind: row.sourceKind,
    rawPayloadJson: JSON.stringify(row.rawPayload),
    fetchedAt: row.fetchedAt,
    dedupeKey: row.dedupeKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAgentRunToGql(
  row: Awaited<ReturnType<typeof listAgentRunsForChannel>>[number],
) {
  return {
    id: row.id,
    contentId: row.contentId,
    agentKind: row.agentKind,
    trigger: row.trigger,
    inputRefJson: JSON.stringify(row.inputRef),
    outputRefJson:
      row.outputRef !== undefined ? JSON.stringify(row.outputRef) : null,
    modelId: row.modelId ?? null,
    status: row.status,
    error: row.error ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapChannelWatchlistToGql(row: ChannelWatchlistRow) {
  return {
    id: row.id,
    contentId: row.contentId,
    platform: row.platform,
    externalChannelId: row.externalChannelId,
    status: row.status,
    source: row.source,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapChannelScoreSnapshotToGql(row: ChannelScoreSnapshotRow) {
  return {
    id: row.id,
    platform: row.platform,
    externalChannelId: row.externalChannelId,
    contentId: row.contentId ?? null,
    status: row.status,
    scores: {
      momentumScore: row.scores.momentumScore,
      consistencyScore: row.scores.consistencyScore,
      reproducibilityScore: row.scores.reproducibilityScore,
      nicheFitScore: row.scores.nicheFitScore,
      monetizationScore: row.scores.monetizationScore,
      overallScore: row.scores.overallScore,
    },
    labels: row.labels,
    rationale: row.rationale,
    riskFlags: row.riskFlags,
    topFormats: row.topFormats.map((t) => ({
      formatLabel: t.formatLabel,
      sampleVideoIds: t.sampleVideoIds,
      confidence: t.confidence,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPerformanceInsightToGql(row: PerformanceInsightRow) {
  return {
    id: row.id,
    jobId: row.jobId,
    publishTargetId: row.publishTargetId ?? null,
    snapshotKind: row.snapshotKind,
    metricsJson: JSON.stringify(row.metrics),
    diagnosis: row.diagnosis ?? null,
    suggestedActions: row.suggestedActions,
    relatedSourceItemId: row.relatedSourceItemId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function handleIdeaCandidatesForChannel(
  rawArgs: Record<string, unknown>,
) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listIdeaCandidatesForChannel(channelId);
  return rows.map(mapIdeaCandidateToGql);
}

async function handleTrendSignalsForChannel(rawArgs: Record<string, unknown>) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listTrendSignalsForChannel(channelId);
  return rows.map(mapTrendSignalToGql);
}

async function handleAgentRunsForChannel(rawArgs: Record<string, unknown>) {
  const { channelId, limit } = agentRunsForChannelArgs.parse(rawArgs);
  const rows = await listAgentRunsForChannel(channelId, limit ?? 50);
  return rows.map(mapAgentRunToGql);
}

async function handlePerformanceInsightsForJob(
  rawArgs: Record<string, unknown>,
) {
  const { jobId } = jobArg.parse(rawArgs);
  const rows = await listPerformanceInsightsForJob(jobId);
  return rows.map(mapPerformanceInsightToGql);
}

async function handleChannelAgentConfig(rawArgs: Record<string, unknown>) {
  const { channelId } = channelArg.parse(rawArgs);
  const row = await getChannelAgentConfigOrDefaults(channelId);
  return {
    channelId: row.channelId,
    scoutPolicyJson: JSON.stringify(row.scoutPolicy),
    automationJson: JSON.stringify(row.automation),
    updatedAt: row.updatedAt,
  };
}

async function handleChannelWatchlist(rawArgs: Record<string, unknown>) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listChannelWatchlistForContent(channelId);
  return rows.map(mapChannelWatchlistToGql);
}

async function handleLatestChannelScoreSnapshotsForChannel(
  rawArgs: Record<string, unknown>,
) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listChannelWatchlistForContent(channelId);
  const out: ChannelScoreSnapshotRow[] = [];
  for (const w of rows) {
    if (w.status !== "WATCHING") {
      continue;
    }
    const snap = await getLatestChannelScoreSnapshot({
      platform: w.platform,
      externalChannelId: w.externalChannelId,
    });
    if (snap) {
      out.push(snap);
    }
  }
  return out.map(mapChannelScoreSnapshotToGql);
}

async function handleCreateChannelWatchlistEntry(
  rawArgs: Record<string, unknown>,
) {
  const { input } = createChannelWatchlistEntryInput.parse(rawArgs);
  const row = await createChannelWatchlistEntry({
    contentId: input.channelId,
    platform: input.platform,
    externalChannelId: input.externalChannelId,
    source: input.source,
    priority: input.priority,
  });
  return mapChannelWatchlistToGql(row);
}

async function handleUpdateChannelWatchlistEntry(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updateChannelWatchlistEntryInput.parse(rawArgs);
  const row = await updateChannelWatchlistEntry({
    watchlistId: input.watchlistId,
    status: input.status,
    priority: input.priority,
  });
  return mapChannelWatchlistToGql(row);
}

async function handlePromoteIdeaCandidateToSource(
  rawArgs: Record<string, unknown>,
) {
  const { input } = promoteIdeaCandidateInput.parse(rawArgs);
  const cand = await getIdeaCandidate(input.ideaCandidateId);
  if (!cand) {
    throw badUserInput("idea candidate not found");
  }
  if (cand.status !== "PENDING") {
    throw badUserInput("idea candidate is not pending");
  }
  const source = await createSourceItem({
    channelId: cand.contentId,
    topic: cand.title,
    masterHook: cand.hook,
    sourceNotes: cand.rationale,
  });
  const updated = await updateIdeaCandidate({
    ideaCandidateId: cand.id,
    status: "PROMOTED_TO_SOURCE",
    promotedSourceItemId: source.id,
  });
  return mapIdeaCandidateToGql(updated);
}

async function handleRejectIdeaCandidate(rawArgs: Record<string, unknown>) {
  const { input } = rejectIdeaCandidateInput.parse(rawArgs);
  const cand = await getIdeaCandidate(input.ideaCandidateId);
  if (!cand) {
    throw badUserInput("idea candidate not found");
  }
  if (cand.status !== "PENDING") {
    throw badUserInput("idea candidate is not pending");
  }
  const updated = await updateIdeaCandidate({
    ideaCandidateId: cand.id,
    status: "REJECTED",
  });
  return mapIdeaCandidateToGql(updated);
}

async function handleUpdateChannelAgentConfig(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updateChannelAgentConfigInput.parse(rawArgs);
  const row = await patchChannelAgentConfigFromJson({
    channelId: input.channelId,
    scoutPolicyJson: input.scoutPolicyJson,
    automationJson: input.automationJson,
  });
  return {
    channelId: row.channelId,
    scoutPolicyJson: JSON.stringify(row.scoutPolicy),
    automationJson: JSON.stringify(row.automation),
    updatedAt: row.updatedAt,
  };
}

async function handleEnqueueTrendScoutJob(rawArgs: Record<string, unknown>) {
  const { input } = enqueueTrendScoutJobInput.parse(rawArgs);
  const queueUrl = getOptionalEnv("TREND_SCOUT_QUEUE_URL");
  if (!queueUrl) {
    throw badUserInput("TREND_SCOUT_QUEUE_URL is not configured");
  }
  const channelId = input.channelId?.trim() || undefined;
  const dryRun = input.dryRun ?? false;
  await sendSqsMessage(queueUrl, {
    contentId: channelId,
    dryRun,
    manual: true,
    source: "GRAPHQL",
    requestedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    message: "트렌드 스카우트 작업이 큐에 추가되었습니다.",
  };
}

const publishDomainHandlers: Record<
  string,
  (raw: Record<string, unknown>) => Promise<unknown>
> = {
  sourceItem: handleSourceItem,
  sourceItemsForChannel: handleSourceItemsForChannel,
  createSourceItem: handleCreateSourceItem,
  updateSourceItem: handleUpdateSourceItem,
  setJobSourceItem: handleSetJobSourceItem,
  platformPublishProfile: handlePlatformPublishProfile,
  upsertPlatformConnection: handleUpsertPlatformConnection,
  updatePlatformPublishProfile: handleUpdatePlatformPublishProfile,
  contentPublishDraft: handleContentPublishDraft,
  updateContentPublishDraft: handleUpdateContentPublishDraft,
  publishTargetsForJob: handlePublishTargetsForJob,
  runPublishOrchestration: handleRunPublishOrchestration,
  ideaCandidatesForChannel: handleIdeaCandidatesForChannel,
  trendSignalsForChannel: handleTrendSignalsForChannel,
  agentRunsForChannel: handleAgentRunsForChannel,
  performanceInsightsForJob: handlePerformanceInsightsForJob,
  channelAgentConfig: handleChannelAgentConfig,
  channelWatchlist: handleChannelWatchlist,
  latestChannelScoreSnapshotsForChannel:
    handleLatestChannelScoreSnapshotsForChannel,
  createChannelWatchlistEntry: handleCreateChannelWatchlistEntry,
  updateChannelWatchlistEntry: handleUpdateChannelWatchlistEntry,
  promoteIdeaCandidateToSource: handlePromoteIdeaCandidateToSource,
  rejectIdeaCandidate: handleRejectIdeaCandidate,
  updateChannelAgentConfig: handleUpdateChannelAgentConfig,
  enqueueTrendScoutJob: handleEnqueueTrendScoutJob,
};

export const routePublishDomain = async (
  fieldName: string | undefined,
  rawArgs: Record<string, unknown>,
): Promise<unknown> => {
  const run = fieldName ? publishDomainHandlers[fieldName] : undefined;
  if (!run) {
    throw badUserInput(`unknown publish domain field: ${fieldName ?? ""}`);
  }
  return run(rawArgs);
};
