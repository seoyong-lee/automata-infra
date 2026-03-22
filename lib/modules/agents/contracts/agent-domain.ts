import { z } from "zod";

import { publishPlatformSchema } from "../../publish/contracts/publish-domain";

/** 외부 수집 소스 종류 */
export const trendSignalSourceKindSchema = z.enum([
  "YOUTUBE_TREND",
  "KEYWORD",
  "COMMENT_SAMPLE",
  "MANUAL",
  "OTHER",
]);
export type TrendSignalSourceKind = z.infer<typeof trendSignalSourceKindSchema>;

export const trendSignalSchema = z.object({
  id: z.string().trim().min(1),
  contentId: z.string().trim().min(1).nullable(),
  sourceKind: trendSignalSourceKindSchema,
  rawPayload: z.record(z.string(), z.unknown()),
  fetchedAt: z.string().trim().min(1),
  dedupeKey: z.string().trim().min(1),
});
export type TrendSignal = z.infer<typeof trendSignalSchema>;

export const ideaCandidateStatusSchema = z.enum([
  "PENDING",
  "PROMOTED_TO_SOURCE",
  "REJECTED",
]);
export type IdeaCandidateStatus = z.infer<typeof ideaCandidateStatusSchema>;

export const ideaCandidateSchema = z.object({
  id: z.string().trim().min(1),
  contentId: z.string().trim().min(1),
  trendSignalIds: z.array(z.string().trim().min(1)),
  title: z.string().trim().min(1),
  hook: z.string().trim().optional(),
  rationale: z.string().trim().optional(),
  score: z.number().min(0).max(1),
  status: ideaCandidateStatusSchema,
  promotedSourceItemId: z.string().trim().min(1).optional(),
});
export type IdeaCandidate = z.infer<typeof ideaCandidateSchema>;

export const agentKindSchema = z.enum([
  "CHANNEL_EVALUATOR",
  "SCOUT",
  "PLANNER",
  "SHIPPING",
  "OPTIMIZER",
]);
export type AgentKind = z.infer<typeof agentKindSchema>;

export const agentRunTriggerSchema = z.enum([
  "SCHEDULE",
  "SQS",
  "SFN",
  "GRAPHQL",
  "MANUAL",
]);
export type AgentRunTrigger = z.infer<typeof agentRunTriggerSchema>;

export const agentRunStatusSchema = z.enum([
  "STARTED",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
]);
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const agentRunSchema = z.object({
  id: z.string().trim().min(1),
  contentId: z.string().trim().min(1).nullable(),
  agentKind: agentKindSchema,
  trigger: agentRunTriggerSchema,
  inputRef: z.record(z.string(), z.unknown()),
  outputRef: z.record(z.string(), z.unknown()).optional(),
  modelId: z.string().optional(),
  tokenUsage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
    })
    .optional(),
  status: agentRunStatusSchema,
  error: z.string().optional(),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const performanceSnapshotKindSchema = z.enum(["T1H", "T24H", "T72H"]);
export type PerformanceSnapshotKind = z.infer<
  typeof performanceSnapshotKindSchema
>;

export const performanceInsightSchema = z.object({
  id: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  publishTargetId: z.string().trim().min(1).optional(),
  snapshotKind: performanceSnapshotKindSchema,
  metrics: z.record(z.string(), z.unknown()),
  /** 가설·휴리스틱 기반 서술(인과 확정 아님) */
  diagnosis: z.string().trim().optional(),
  suggestedActions: z.array(z.string().trim().min(1)),
  relatedSourceItemId: z.string().trim().min(1).optional(),
});
export type PerformanceInsight = z.infer<typeof performanceInsightSchema>;

export const scoutPolicySchema = z.object({
  allowedTopics: z.array(z.string()),
  blockedTopics: z.array(z.string()),
  targetPlatforms: z.array(publishPlatformSchema),
  targetDurationSec: z.number().int().positive().optional(),
  revenueMode: z.boolean().optional(),
  minIdeaScoreToCreateSource: z.number().min(0).max(1).optional(),
});
export type ScoutPolicy = z.infer<typeof scoutPolicySchema>;

export const channelAutomationFlagsSchema = z.object({
  autoScoutEnabled: z.boolean(),
  autoDraftEnabled: z.boolean(),
  autoEnqueueEnabled: z.boolean(),
  autoPublishEnabled: z.boolean(),
  autoOptimizeEnabled: z.boolean(),
  humanReviewRequired: z.boolean(),
});
export type ChannelAutomationFlags = z.infer<
  typeof channelAutomationFlagsSchema
>;

export const defaultChannelAutomationFlags = (): ChannelAutomationFlags => ({
  autoScoutEnabled: false,
  autoDraftEnabled: false,
  autoEnqueueEnabled: false,
  autoPublishEnabled: false,
  autoOptimizeEnabled: false,
  humanReviewRequired: true,
});

export const channelAgentConfigPayloadSchema = z.object({
  scoutPolicy: scoutPolicySchema,
  automation: channelAutomationFlagsSchema,
});
export type ChannelAgentConfigPayload = z.infer<
  typeof channelAgentConfigPayloadSchema
>;

/** 외부 채널 플랫폼 (1차 YouTube) */
export const externalPlatformSchema = z.enum(["YOUTUBE"]);
export type ExternalPlatform = z.infer<typeof externalPlatformSchema>;

const channelStatsSchema = z.object({
  subscriberCount: z.number().optional(),
  videoCount: z.number().optional(),
  totalViewCount: z.number().optional(),
});

const recentWindowSchema = z.object({
  sampledVideoCount: z.number().int().nonnegative(),
  sampledShortCount: z.number().int().nonnegative(),
  avgViews: z.number().optional(),
  medianViews: z.number().optional(),
  p90Views: z.number().optional(),
  avgLikes: z.number().optional(),
  avgComments: z.number().optional(),
  uploadCadencePerWeek: z.number().optional(),
});

export const channelSignalSchema = z.object({
  id: z.string().trim().min(1),
  platform: externalPlatformSchema,
  externalChannelId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  handle: z.string().trim().optional(),
  country: z.string().trim().optional(),
  language: z.string().trim().optional(),
  stats: channelStatsSchema,
  recentWindow: recentWindowSchema,
  fetchedAt: z.string().trim().min(1),
  rawPayload: z.unknown().optional(),
});
export type ChannelSignal = z.infer<typeof channelSignalSchema>;

export const channelScoreSnapshotStatusSchema = z.enum([
  "ACTIVE",
  "STALE",
  "REJECTED",
]);
export type ChannelScoreSnapshotStatus = z.infer<
  typeof channelScoreSnapshotStatusSchema
>;

const channelScoresSchema = z.object({
  momentumScore: z.number().min(0).max(1),
  consistencyScore: z.number().min(0).max(1),
  reproducibilityScore: z.number().min(0).max(1),
  nicheFitScore: z.number().min(0).max(1),
  monetizationScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1),
});

const topFormatSchema = z.object({
  formatLabel: z.string().trim().min(1),
  sampleVideoIds: z.array(z.string().trim().min(1)),
  confidence: z.number().min(0).max(1),
});

export const channelScoreSnapshotSchema = z.object({
  id: z.string().trim().min(1),
  platform: externalPlatformSchema,
  externalChannelId: z.string().trim().min(1),
  contentId: z.string().trim().min(1).optional(),
  status: channelScoreSnapshotStatusSchema,
  scores: channelScoresSchema,
  labels: z.array(z.string().trim().min(1)),
  rationale: z.array(z.string().trim().min(1)),
  riskFlags: z.array(z.string().trim().min(1)),
  topFormats: z.array(topFormatSchema),
});
export type ChannelScoreSnapshot = z.infer<typeof channelScoreSnapshotSchema>;

export const channelWatchlistStatusSchema = z.enum([
  "WATCHING",
  "PAUSED",
  "ARCHIVED",
]);
export type ChannelWatchlistStatus = z.infer<
  typeof channelWatchlistStatusSchema
>;

export const channelWatchlistSourceSchema = z.enum([
  "AUTO_DISCOVERED",
  "MANUAL",
]);
export type ChannelWatchlistSource = z.infer<
  typeof channelWatchlistSourceSchema
>;

export const channelWatchlistEntrySchema = z.object({
  id: z.string().trim().min(1),
  contentId: z.string().trim().min(1),
  platform: externalPlatformSchema,
  externalChannelId: z.string().trim().min(1),
  status: channelWatchlistStatusSchema,
  source: channelWatchlistSourceSchema,
  priority: z.number().int(),
});
export type ChannelWatchlistEntry = z.infer<typeof channelWatchlistEntrySchema>;

/** overall 가중 (문서 기본값; 튜닝 가능) */
export const defaultChannelOverallWeights = () =>
  ({
    momentum: 0.25,
    consistency: 0.2,
    reproducibility: 0.2,
    nicheFit: 0.2,
    monetization: 0.15,
  }) as const;

export const computeOverallChannelScore = (input: {
  momentumScore: number;
  consistencyScore: number;
  reproducibilityScore: number;
  nicheFitScore: number;
  monetizationScore: number;
}): number => {
  const w = defaultChannelOverallWeights();
  return Math.min(
    1,
    Math.max(
      0,
      w.momentum * input.momentumScore +
        w.consistency * input.consistencyScore +
        w.reproducibility * input.reproducibilityScore +
        w.nicheFit * input.nicheFitScore +
        w.monetization * input.monetizationScore,
    ),
  );
};
