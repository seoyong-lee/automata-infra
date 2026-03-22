import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { getGraphqlRuntime } from "./runtime";
import { gqlFetch } from "./client/fetcher";
import { UnauthorizedError } from "./client/errors";

export type AdminJob = {
  jobId: string;
  contentId?: string | null;
  sourceItemId?: string | null;
  status:
    | "DRAFT"
    | "PLANNING"
    | "PLANNED"
    | "SCENE_JSON_BUILDING"
    | "SCENE_JSON_READY"
    | "ASSET_GENERATING"
    | "ASSETS_READY"
    | "VALIDATING"
    | "RENDER_PLAN_READY"
    | "RENDERED"
    | "REVIEW_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "READY_TO_SCHEDULE"
    | "UPLOAD_QUEUED"
    | "UPLOADED"
    | "FAILED"
    | "METRICS_COLLECTED";
  reviewAction?: "PENDING" | "APPROVE" | "REJECT" | "REGENERATE" | null;
  topicId: string;
  contentType?: string | null;
  variant?: string | null;
  autoPublish?: boolean | null;
  publishAt?: string | null;
  language: string;
  targetDurationSec: number;
  retryCount: number;
  createdAt: string;
  videoTitle: string;
  sceneJsonS3Key?: string | null;
  assetManifestS3Key?: string | null;
  renderPlanS3Key?: string | null;
  finalVideoS3Key?: string | null;
  thumbnailS3Key?: string | null;
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
  uploadStatus?: string | null;
  uploadVideoId?: string | null;
  contentBriefS3Key?: string | null;
  topicSeedS3Key?: string | null;
  topicS3Key?: string | null;
  approvedTopicExecutionId?: string | null;
  approvedSceneExecutionId?: string | null;
  approvedAssetExecutionId?: string | null;
  updatedAt: string;
};

export type PublishPlatform = "YOUTUBE" | "TIKTOK" | "INSTAGRAM";

export type PlatformConnectionStatus =
  | "CONNECTED"
  | "EXPIRED"
  | "ERROR"
  | "DISCONNECTED";

export type PublishTargetStatus =
  | "QUEUED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "SKIPPED";

export type PlatformConnection = {
  platformConnectionId: string;
  channelId: string;
  platform: PublishPlatform;
  accountId: string;
  accountHandle?: string | null;
  oauthAccountId: string;
  status: PlatformConnectionStatus;
  connectedAt: string;
  lastSyncedAt?: string | null;
};

export type PublishTarget = {
  publishTargetId: string;
  channelContentItemId: string;
  platformConnectionId: string;
  platform: PublishPlatform;
  status: PublishTargetStatus;
  scheduledAt?: string | null;
  externalPostId?: string | null;
  externalUrl?: string | null;
  publishError?: string | null;
};

export type ChannelPublishQueueItem = {
  queueItemId: string;
  channelId: string;
  jobId: string;
  channelContentItemId: string;
  status: "QUEUED" | "SCHEDULED" | "PUBLISHED" | "REMOVED";
  priority: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  note?: string | null;
  enqueuedBy?: string | null;
  publishTargets: PublishTarget[];
};

export type PendingReview = {
  jobId: string;
  status: AdminJob["status"];
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
};

export type LlmProvider = "OPENAI" | "GEMINI" | "BEDROCK";

export type TopicSeed = {
  contentId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string | null;
};

export type ContentBrief = {
  jobId: string;
  contentType: string;
  variant: string;
  contentId: string;
  language: string;
  targetPlatform: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  autoPublish?: boolean | null;
  publishAt?: string | null;
  seed: {
    date: string;
    fortuneType: string;
    audience: string;
    style: string;
    tone: string;
    topicKey: string;
  };
  constraints: {
    maxScenes: number;
    mustHaveHook: boolean;
    mustHaveCTA: boolean;
    safetyLevel: "default" | "strict" | "relaxed";
    noMedicalOrLegalClaims: boolean;
  };
};

export type SceneJsonScene = {
  sceneId: number;
  durationSec: number;
  narration: string;
  imagePrompt: string;
  videoPrompt?: string | null;
  subtitle: string;
  bgmMood?: string | null;
  sfx?: string[] | null;
};

export type SceneJsonPayload = {
  videoTitle: string;
  language: string;
  scenes: SceneJsonScene[];
};

export type SceneAsset = {
  sceneId: number;
  imageS3Key?: string | null;
  videoClipS3Key?: string | null;
  voiceS3Key?: string | null;
  durationSec?: number | null;
  narration?: string | null;
  subtitle?: string | null;
  imagePrompt?: string | null;
  videoPrompt?: string | null;
  validationStatus?: string | null;
};

export type JobDraftDetail = {
  job: AdminJob;
  contentBrief?: ContentBrief | null;
  topicSeed?: TopicSeed | null;
  topicPlan?: TopicSeed | null;
  sceneJson?: SceneJsonPayload | null;
  assets: SceneAsset[];
};

export type JobTimelineItem = {
  pk: string;
  sk: string;
  /** Raw Dynamo-style payload JSON string (resolver maps full item). */
  data: string;
};

export type PipelineExecution = {
  executionId: string;
  jobId: string;
  stageType: "TOPIC_PLAN" | "SCENE_JSON" | "ASSET_GENERATION";
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  triggeredBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  inputSnapshotId?: string | null;
  outputArtifactS3Key?: string | null;
};

export type LlmStepSettings = {
  stepKey: string;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number | null;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  updatedAt: string;
  updatedBy: string;
};

export type Connection<T> = {
  items: T[];
  nextToken?: string | null;
};

/** 백엔드 `ADMIN_UNASSIGNED_CONTENT_ID`와 동기. 미연결 잡 전용 placeholder. */
export const ADMIN_UNASSIGNED_CONTENT_ID = "__unassigned__";

export type AdminContent = {
  contentId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  youtubeSecretName?: string | null;
  youtubeAccountType?: string | null;
  autoPublishEnabled?: boolean | null;
  defaultVisibility?: string | null;
  defaultCategoryId?: number | null;
  playlistId?: string | null;
  youtubeUpdatedAt?: string | null;
  youtubeUpdatedBy?: string | null;
};

const adminContentsQuery = `
  query AdminContents($limit: Int, $nextToken: String) {
    adminContents(limit: $limit, nextToken: $nextToken) {
      items {
        contentId
        label
        createdAt
        updatedAt
        youtubeSecretName
        youtubeAccountType
        autoPublishEnabled
        defaultVisibility
        defaultCategoryId
        playlistId
        youtubeUpdatedAt
        youtubeUpdatedBy
      }
      nextToken
    }
  }
`;

const adminJobsQuery = `
  query AdminJobs($status: JobStatus, $contentId: String, $limit: Int, $nextToken: String) {
    adminJobs(status: $status, contentId: $contentId, limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        contentId
        status
        reviewAction
        contentType
        variant
        autoPublish
        publishAt
        videoTitle
        targetDurationSec
        retryCount
        updatedAt
      }
      nextToken
    }
  }
`;

const pendingReviewsQuery = `
  query PendingReviews($limit: Int, $nextToken: String) {
    pendingReviews(limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        status
        previewS3Key
        reviewRequestedAt
      }
      nextToken
    }
  }
`;

const llmSettingsQuery = `
  query LlmSettings {
    llmSettings {
      items {
        stepKey
        provider
        model
        temperature
        maxOutputTokens
        secretIdEnvVar
        promptVersion
        systemPrompt
        userPrompt
        updatedAt
        updatedBy
      }
    }
  }
`;

const jobTimelineQuery = `
  query JobTimeline($jobId: ID!) {
    jobTimeline(jobId: $jobId) {
      pk
      sk
      data
    }
  }
`;

const jobExecutionsQuery = `
  query JobExecutions($jobId: ID!) {
    jobExecutions(jobId: $jobId) {
      executionId
      jobId
      stageType
      status
      triggeredBy
      startedAt
      completedAt
      errorMessage
      inputSnapshotId
      outputArtifactS3Key
    }
  }
`;

const channelPublishQueueQuery = `
  query ChannelPublishQueue($contentId: ID!) {
    channelPublishQueue(contentId: $contentId) {
      queueItemId
      channelId
      jobId
      channelContentItemId
      status
      priority
      createdAt
      updatedAt
      scheduledAt
      publishedAt
      note
      enqueuedBy
      publishTargets {
        publishTargetId
        channelContentItemId
        platformConnectionId
        platform
        status
        scheduledAt
        externalPostId
        externalUrl
        publishError
      }
    }
  }
`;

const platformConnectionsQuery = `
  query PlatformConnections($contentId: ID!) {
    platformConnections(contentId: $contentId) {
      platformConnectionId
      channelId
      platform
      accountId
      accountHandle
      oauthAccountId
      status
      connectedAt
      lastSyncedAt
    }
  }
`;

const jobDraftQuery = `
  query JobDraft($jobId: ID!) {
    jobDraft(jobId: $jobId) {
      job {
        jobId
        contentId
        sourceItemId
        status
        reviewAction
        topicId
        contentType
        variant
        autoPublish
        publishAt
        language
        targetDurationSec
        retryCount
        createdAt
        updatedAt
        videoTitle
        sceneJsonS3Key
        assetManifestS3Key
        renderPlanS3Key
        finalVideoS3Key
        thumbnailS3Key
        previewS3Key
        reviewRequestedAt
        uploadStatus
        uploadVideoId
        contentBriefS3Key
        topicSeedS3Key
        topicS3Key
        approvedTopicExecutionId
        approvedSceneExecutionId
        approvedAssetExecutionId
      }
      contentBrief {
        jobId
        contentType
        variant
        contentId
        language
        targetPlatform
        targetDurationSec
        titleIdea
        stylePreset
        autoPublish
        publishAt
        seed {
          date
          fortuneType
          audience
          style
          tone
          topicKey
        }
        constraints {
          maxScenes
          mustHaveHook
          mustHaveCTA
          safetyLevel
          noMedicalOrLegalClaims
        }
      }
      topicSeed {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      topicPlan {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      sceneJson {
        videoTitle
        language
        scenes {
          sceneId
          durationSec
          narration
          imagePrompt
          videoPrompt
          subtitle
          bgmMood
          sfx
        }
      }
      assets {
        sceneId
        imageS3Key
        videoClipS3Key
        voiceS3Key
        durationSec
        narration
        subtitle
        imagePrompt
        videoPrompt
        validationStatus
      }
    }
  }
`;

const submitReviewMutation = `
  mutation SubmitReviewDecision($input: SubmitReviewDecisionInput!) {
    submitReviewDecision(input: $input) {
      ok
      jobId
      action
      regenerationScope
      targetSceneId
      status
    }
  }
`;

const requestUploadMutation = `
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      ok
      jobId
      status
      platform
    }
  }
`;

const updateLlmStepSettingsMutation = `
  mutation UpdateLlmStepSettings($input: UpdateLlmStepSettingsInput!) {
    updateLlmStepSettings(input: $input) {
      stepKey
      provider
      model
      temperature
      maxOutputTokens
      secretIdEnvVar
      promptVersion
      systemPrompt
      userPrompt
      updatedAt
      updatedBy
    }
  }
`;

const deleteJobMutation = `
  mutation DeleteJob($jobId: ID!) {
    deleteJob(jobId: $jobId) {
      ok
      jobId
    }
  }
`;

const createContentMutation = `
  mutation CreateContent($input: CreateContentInput!) {
    createContent(input: $input) {
      contentId
      label
      createdAt
      updatedAt
      youtubeSecretName
      youtubeAccountType
      autoPublishEnabled
      defaultVisibility
      defaultCategoryId
      playlistId
      youtubeUpdatedAt
      youtubeUpdatedBy
    }
  }
`;

const deleteContentMutation = `
  mutation DeleteContent($contentId: ID!) {
    deleteContent(contentId: $contentId) {
      ok
      contentId
    }
  }
`;

const updateContentMutation = `
  mutation UpdateContent($input: UpdateContentInput!) {
    updateContent(input: $input) {
      contentId
      label
      createdAt
      updatedAt
      youtubeSecretName
      youtubeAccountType
      autoPublishEnabled
      defaultVisibility
      defaultCategoryId
      playlistId
      youtubeUpdatedAt
      youtubeUpdatedBy
    }
  }
`;

const attachJobToContentMutation = `
  mutation AttachJobToContent($input: AttachJobToContentInput!) {
    attachJobToContent(input: $input) {
      jobId
      contentId
      status
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      updatedAt
      videoTitle
      contentBriefS3Key
      topicSeedS3Key
      topicS3Key
    }
  }
`;

const createDraftJobMutation = `
  mutation CreateDraftJob($input: CreateDraftJobInput!) {
    createDraftJob(input: $input) {
      jobId
      contentId
      status
      topicId
      contentType
      variant
      autoPublish
      publishAt
      language
      targetDurationSec
      retryCount
      createdAt
      updatedAt
      videoTitle
      contentBriefS3Key
      topicSeedS3Key
      topicS3Key
    }
  }
`;

const updateTopicSeedMutation = `
  mutation UpdateTopicSeed($input: UpdateTopicSeedInput!) {
    updateTopicSeed(input: $input) {
      contentId
      targetLanguage
      titleIdea
      targetDurationSec
      stylePreset
    }
  }
`;

const runTopicPlanMutation = `
  mutation RunTopicPlan($input: RunTopicPlanInput!) {
    runTopicPlan(input: $input) {
      jobId
      status
      updatedAt
      topicS3Key
      videoTitle
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
    }
  }
`;

const runSceneJsonMutation = `
  mutation RunSceneJson($input: RunSceneJsonInput!) {
    runSceneJson(input: $input) {
      jobId
      status
      updatedAt
      sceneJsonS3Key
      videoTitle
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
    }
  }
`;

const updateSceneJsonMutation = `
  mutation UpdateSceneJson($input: UpdateSceneJsonInput!) {
    updateSceneJson(input: $input) {
      job {
        jobId
        status
        updatedAt
        sceneJsonS3Key
        contentId
        topicId
        language
        targetDurationSec
        retryCount
        createdAt
        videoTitle
      }
      topicSeed {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      topicPlan {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      sceneJson {
        videoTitle
        language
        scenes {
          sceneId
          durationSec
          narration
          imagePrompt
          videoPrompt
          subtitle
          bgmMood
          sfx
        }
      }
      assets {
        sceneId
        imageS3Key
        videoClipS3Key
        voiceS3Key
      }
    }
  }
`;

const runAssetGenerationMutation = `
  mutation RunAssetGeneration($input: RunAssetGenerationInput!) {
    runAssetGeneration(input: $input) {
      jobId
      status
      updatedAt
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      videoTitle
      sceneJsonS3Key
      assetManifestS3Key
    }
  }
`;

const approvePipelineExecutionMutation = `
  mutation ApprovePipelineExecution($input: ApprovePipelineExecutionInput!) {
    approvePipelineExecution(input: $input) {
      jobId
      status
      updatedAt
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      videoTitle
      topicS3Key
      sceneJsonS3Key
      assetManifestS3Key
      topicSeedS3Key
      approvedTopicExecutionId
      approvedSceneExecutionId
      approvedAssetExecutionId
    }
  }
`;

const enqueueToChannelPublishQueueMutation = `
  mutation EnqueueToChannelPublishQueue($input: EnqueueToChannelPublishQueueInput!) {
    enqueueToChannelPublishQueue(input: $input) {
      queueItemId
      channelId
      jobId
      channelContentItemId
      status
      priority
      createdAt
      updatedAt
      scheduledAt
      publishedAt
      note
      enqueuedBy
      publishTargets {
        publishTargetId
        channelContentItemId
        platformConnectionId
        platform
        status
        scheduledAt
        externalPostId
        externalUrl
        publishError
      }
    }
  }
`;

const runPublishOrchestrationMutation = `
  mutation RunPublishOrchestration($input: RunPublishOrchestrationInput!) {
    runPublishOrchestration(input: $input) {
      ok
      jobId
      message
    }
  }
`;

const enqueueTrendScoutJobMutation = `
  mutation EnqueueTrendScoutJob($input: EnqueueTrendScoutJobInput!) {
    enqueueTrendScoutJob(input: $input) {
      ok
      message
    }
  }
`;

const contentPublishDraftQuery = `
  query ContentPublishDraft($jobId: ID!) {
    contentPublishDraft(jobId: $jobId) {
      channelContentItemId
      globalDraft {
        title
        caption
        description
        hashtags
        thumbnailAssetId
      }
      platformDrafts {
        platform
        targetConnectionId
        enabled
        metadataJson
        overrideFields
        validationStatus
      }
    }
  }
`;

const publishTargetsForJobQuery = `
  query PublishTargetsForJob($jobId: ID!) {
    publishTargetsForJob(jobId: $jobId) {
      publishTargetId
      channelContentItemId
      platformConnectionId
      platform
      status
      scheduledAt
      externalPostId
      externalUrl
      publishError
    }
  }
`;

const sourceItemQuery = `
  query SourceItem($id: ID!) {
    sourceItem(id: $id) {
      id
      topic
      masterHook
      sourceNotes
      status
      createdAt
      updatedAt
    }
  }
`;

const sourceItemsForChannelQuery = `
  query SourceItemsForChannel($channelId: ID!) {
    sourceItemsForChannel(channelId: $channelId) {
      id
      topic
      masterHook
      sourceNotes
      status
      createdAt
      updatedAt
    }
  }
`;

const ideaCandidatesForChannelQuery = `
  query IdeaCandidatesForChannel($channelId: ID!) {
    ideaCandidatesForChannel(channelId: $channelId) {
      id
      contentId
      trendSignalIds
      title
      hook
      rationale
      score
      status
      promotedSourceItemId
      createdAt
      updatedAt
    }
  }
`;

const channelAgentConfigQuery = `
  query ChannelAgentConfig($channelId: ID!) {
    channelAgentConfig(channelId: $channelId) {
      channelId
      scoutPolicyJson
      automationJson
      updatedAt
    }
  }
`;

const channelWatchlistQuery = `
  query ChannelWatchlist($channelId: ID!) {
    channelWatchlist(channelId: $channelId) {
      id
      contentId
      platform
      externalChannelId
      status
      source
      priority
      createdAt
      updatedAt
    }
  }
`;

const latestChannelScoreSnapshotsForChannelQuery = `
  query LatestChannelScoreSnapshotsForChannel($channelId: ID!) {
    latestChannelScoreSnapshotsForChannel(channelId: $channelId) {
      id
      platform
      externalChannelId
      contentId
      status
      scores {
        momentumScore
        consistencyScore
        reproducibilityScore
        nicheFitScore
        monetizationScore
        overallScore
      }
      labels
      rationale
      riskFlags
      topFormats {
        formatLabel
        sampleVideoIds
        confidence
      }
      createdAt
      updatedAt
    }
  }
`;

const agentRunsForChannelQuery = `
  query AgentRunsForChannel($channelId: ID!, $limit: Int) {
    agentRunsForChannel(channelId: $channelId, limit: $limit) {
      id
      contentId
      agentKind
      trigger
      inputRefJson
      outputRefJson
      modelId
      status
      error
      createdAt
      updatedAt
    }
  }
`;

const performanceInsightsForJobQuery = `
  query PerformanceInsightsForJob($jobId: ID!) {
    performanceInsightsForJob(jobId: $jobId) {
      id
      jobId
      publishTargetId
      snapshotKind
      metricsJson
      diagnosis
      suggestedActions
      relatedSourceItemId
      createdAt
      updatedAt
    }
  }
`;

const promoteIdeaCandidateToSourceMutation = `
  mutation PromoteIdeaCandidateToSource($input: PromoteIdeaCandidateInput!) {
    promoteIdeaCandidateToSource(input: $input) {
      id
      contentId
      trendSignalIds
      title
      hook
      rationale
      score
      status
      promotedSourceItemId
      createdAt
      updatedAt
    }
  }
`;

const rejectIdeaCandidateMutation = `
  mutation RejectIdeaCandidate($input: RejectIdeaCandidateInput!) {
    rejectIdeaCandidate(input: $input) {
      id
      status
      updatedAt
    }
  }
`;

const updateChannelAgentConfigMutation = `
  mutation UpdateChannelAgentConfig($input: UpdateChannelAgentConfigInput!) {
    updateChannelAgentConfig(input: $input) {
      channelId
      scoutPolicyJson
      automationJson
      updatedAt
    }
  }
`;

const createChannelWatchlistEntryMutation = `
  mutation CreateChannelWatchlistEntry($input: CreateChannelWatchlistEntryInput!) {
    createChannelWatchlistEntry(input: $input) {
      id
      contentId
      platform
      externalChannelId
      status
      source
      priority
      createdAt
      updatedAt
    }
  }
`;

const updateChannelWatchlistEntryMutation = `
  mutation UpdateChannelWatchlistEntry($input: UpdateChannelWatchlistEntryInput!) {
    updateChannelWatchlistEntry(input: $input) {
      id
      contentId
      platform
      externalChannelId
      status
      source
      priority
      createdAt
      updatedAt
    }
  }
`;

const platformPublishProfileQuery = `
  query PlatformPublishProfile($channelId: ID!, $platformConnectionId: ID!) {
    platformPublishProfile(channelId: $channelId, platformConnectionId: $platformConnectionId) {
      platformConnectionId
      channelId
      defaultVisibility
      defaultLanguage
      defaultHashtags
      captionFooterTemplate
      preferredSlots
      youtubeCategoryId
      youtubePlaylistIds
      youtubeTags
      tiktokDisclosureTemplate
      instagramFirstCommentTemplate
    }
  }
`;

const createSourceItemMutation = `
  mutation CreateSourceItem($input: CreateSourceItemInput!) {
    createSourceItem(input: $input) {
      id
      topic
      masterHook
      sourceNotes
      status
      createdAt
      updatedAt
    }
  }
`;

const setJobSourceItemMutation = `
  mutation SetJobSourceItem($input: SetJobSourceItemInput!) {
    setJobSourceItem(input: $input) {
      jobId
      contentId
      sourceItemId
      status
      updatedAt
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      videoTitle
      topicS3Key
      sceneJsonS3Key
      assetManifestS3Key
      topicSeedS3Key
      approvedTopicExecutionId
      approvedSceneExecutionId
      approvedAssetExecutionId
    }
  }
`;

const upsertPlatformConnectionMutation = `
  mutation UpsertPlatformConnection($input: UpsertPlatformConnectionInput!) {
    upsertPlatformConnection(input: $input) {
      platformConnectionId
      channelId
      platform
      accountId
      accountHandle
      oauthAccountId
      status
      connectedAt
      lastSyncedAt
    }
  }
`;

const updateContentPublishDraftMutation = `
  mutation UpdateContentPublishDraft($input: UpdateContentPublishDraftInput!) {
    updateContentPublishDraft(input: $input) {
      channelContentItemId
      globalDraft {
        title
        caption
        description
        hashtags
        thumbnailAssetId
      }
      platformDrafts {
        platform
        targetConnectionId
        enabled
        metadataJson
        overrideFields
        validationStatus
      }
    }
  }
`;

export type SourceItemGql = {
  id: string;
  topic: string;
  masterHook?: string | null;
  sourceNotes?: string | null;
  status: "IDEATING" | "READY_FOR_DISTRIBUTION" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type IdeaCandidateGql = {
  id: string;
  contentId: string;
  trendSignalIds: string[];
  title: string;
  hook?: string | null;
  rationale?: string | null;
  score: number;
  status: "PENDING" | "PROMOTED_TO_SOURCE" | "REJECTED";
  promotedSourceItemId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChannelAgentConfigGql = {
  channelId: string;
  scoutPolicyJson: string;
  automationJson: string;
  updatedAt: string;
};

export type ChannelScoresGql = {
  momentumScore: number;
  consistencyScore: number;
  reproducibilityScore: number;
  nicheFitScore: number;
  monetizationScore: number;
  overallScore: number;
};

export type ChannelTopFormatGql = {
  formatLabel: string;
  sampleVideoIds: string[];
  confidence: number;
};

export type ChannelScoreSnapshotGql = {
  id: string;
  platform: "YOUTUBE";
  externalChannelId: string;
  contentId?: string | null;
  status: "ACTIVE" | "STALE" | "REJECTED";
  scores: ChannelScoresGql;
  labels: string[];
  rationale: string[];
  riskFlags: string[];
  topFormats: ChannelTopFormatGql[];
  createdAt: string;
  updatedAt: string;
};

export type ChannelWatchlistEntryGql = {
  id: string;
  contentId: string;
  platform: "YOUTUBE";
  externalChannelId: string;
  status: "WATCHING" | "PAUSED" | "ARCHIVED";
  source: "AUTO_DISCOVERED" | "MANUAL";
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunGql = {
  id: string;
  contentId?: string | null;
  agentKind:
    | "CHANNEL_EVALUATOR"
    | "SCOUT"
    | "PLANNER"
    | "SHIPPING"
    | "OPTIMIZER";
  trigger: "SCHEDULE" | "SQS" | "SFN" | "GRAPHQL" | "MANUAL";
  inputRefJson: string;
  outputRefJson?: string | null;
  modelId?: string | null;
  status: "STARTED" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceInsightGql = {
  id: string;
  jobId: string;
  publishTargetId?: string | null;
  snapshotKind: "T1H" | "T24H" | "T72H";
  metricsJson: string;
  diagnosis?: string | null;
  suggestedActions: string[];
  relatedSourceItemId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformPublishProfileGql = {
  platformConnectionId: string;
  channelId: string;
  defaultVisibility?: string | null;
  defaultLanguage?: string | null;
  defaultHashtags: string[];
  captionFooterTemplate?: string | null;
  preferredSlots: string[];
  youtubeCategoryId?: string | null;
  youtubePlaylistIds: string[];
  youtubeTags: string[];
  tiktokDisclosureTemplate?: string | null;
  instagramFirstCommentTemplate?: string | null;
};

export type PublishOrchestrationResult = {
  ok: boolean;
  jobId: string;
  message?: string | null;
};

export type EnqueueTrendScoutJobResult = {
  ok: boolean;
  message: string;
};

export type ContentPublishDraftGql = {
  channelContentItemId: string;
  globalDraft: {
    title?: string | null;
    caption?: string | null;
    description?: string | null;
    hashtags: string[];
    thumbnailAssetId?: string | null;
  };
  platformDrafts: Array<{
    platform: PublishPlatform;
    targetConnectionId: string;
    enabled: boolean;
    metadataJson: string;
    overrideFields?: string[] | null;
    validationStatus?: string | null;
  }>;
};

const gql = async <T>(query: string, variables?: Record<string, unknown>) => {
  const runtime = getGraphqlRuntime();
  const token = runtime.getToken ? await runtime.getToken() : null;
  try {
    return await gqlFetch<T>({
      url: runtime.url,
      query,
      variables,
      token,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      runtime.onUnauthorized?.();
    }
    throw error;
  }
};

export const useAdminContentsQuery = (
  vars: { limit?: number; nextToken?: string },
  options?: Omit<
    UseQueryOptions<
      Connection<AdminContent>,
      Error,
      Connection<AdminContent>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["adminContents", vars.limit ?? 50, vars.nextToken ?? ""],
    queryFn: async () => {
      const data = await gql<{ adminContents: Connection<AdminContent> }>(
        adminContentsQuery,
        vars,
      );
      return data.adminContents;
    },
    ...options,
  });
};

export const useAdminJobsQuery = (
  vars: {
    status?: AdminJob["status"];
    contentId?: string;
    limit?: number;
    nextToken?: string;
  },
  options?: Omit<
    UseQueryOptions<
      Connection<AdminJob>,
      Error,
      Connection<AdminJob>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: [
      "adminJobs",
      vars.status ?? "",
      vars.contentId ?? "",
      vars.limit ?? 20,
      vars.nextToken ?? "",
    ],
    queryFn: async () => {
      const data = await gql<{ adminJobs: Connection<AdminJob> }>(
        adminJobsQuery,
        vars,
      );
      return data.adminJobs;
    },
    ...options,
  });
};

export const usePendingReviewsQuery = (
  vars: { limit?: number; nextToken?: string },
  options?: Omit<
    UseQueryOptions<
      Connection<PendingReview>,
      Error,
      Connection<PendingReview>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["pendingReviews", vars.limit ?? 20, vars.nextToken ?? ""],
    queryFn: async () => {
      const data = await gql<{ pendingReviews: Connection<PendingReview> }>(
        pendingReviewsQuery,
        vars,
      );
      return data.pendingReviews;
    },
    ...options,
  });
};

export const useLlmSettingsQuery = (
  options?: Omit<
    UseQueryOptions<
      LlmStepSettings[],
      Error,
      LlmStepSettings[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["llmSettings"],
    queryFn: async () => {
      const data = await gql<{ llmSettings: { items: LlmStepSettings[] } }>(
        llmSettingsQuery,
      );
      return data.llmSettings.items;
    },
    ...options,
  });
};

export const useJobDraftQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      JobDraftDetail | null,
      Error,
      JobDraftDetail | null,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["jobDraft", vars.jobId],
    queryFn: async () => {
      const data = await gql<{ jobDraft: JobDraftDetail | null }>(
        jobDraftQuery,
        vars,
      );
      return data.jobDraft;
    },
    ...options,
  });
};

export const useJobTimelineQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      JobTimelineItem[],
      Error,
      JobTimelineItem[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["jobTimeline", vars.jobId],
    queryFn: async () => {
      const data = await gql<{ jobTimeline: JobTimelineItem[] }>(
        jobTimelineQuery,
        vars,
      );
      return data.jobTimeline;
    },
    ...options,
  });
};

export const useJobExecutionsQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      PipelineExecution[],
      Error,
      PipelineExecution[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["jobExecutions", vars.jobId],
    queryFn: async () => {
      const data = await gql<{ jobExecutions: PipelineExecution[] }>(
        jobExecutionsQuery,
        vars,
      );
      return data.jobExecutions;
    },
    ...options,
  });
};

/** 제작 아이템별 실행 이력을 직접 조회할 때(예: 여러 jobId 병렬 요약). */
export const fetchJobExecutions = async (
  jobId: string,
): Promise<PipelineExecution[]> => {
  const data = await gql<{ jobExecutions: PipelineExecution[] }>(
    jobExecutionsQuery,
    { jobId },
  );
  return data.jobExecutions;
};

export const useChannelPublishQueueQuery = (
  vars: { contentId: string },
  options?: Omit<
    UseQueryOptions<
      ChannelPublishQueueItem[],
      Error,
      ChannelPublishQueueItem[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["channelPublishQueue", vars.contentId],
    queryFn: async () => {
      try {
        const data = await gql<{
          channelPublishQueue: ChannelPublishQueueItem[] | null;
        }>(channelPublishQueueQuery, vars);
        return data.channelPublishQueue ?? [];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          /channelPublishQueue/i.test(msg) &&
          (/non-nullable|null/i.test(msg) || /Cannot return null/i.test(msg))
        ) {
          return [];
        }
        throw e;
      }
    },
    enabled: Boolean(vars.contentId),
    ...options,
  });
};

export const usePlatformConnectionsQuery = (
  vars: { contentId: string },
  options?: Omit<
    UseQueryOptions<
      PlatformConnection[],
      Error,
      PlatformConnection[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["platformConnections", vars.contentId],
    queryFn: async () => {
      const data = await gql<{ platformConnections: PlatformConnection[] }>(
        platformConnectionsQuery,
        vars,
      );
      return data.platformConnections ?? [];
    },
    enabled: Boolean(vars.contentId),
    ...options,
  });
};

export const useEnqueueToChannelPublishQueueMutation = (
  options?: UseMutationOptions<
    { enqueueToChannelPublishQueue: ChannelPublishQueueItem },
    Error,
    { contentId: string; jobId: string; note?: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ enqueueToChannelPublishQueue: ChannelPublishQueueItem }>(
        enqueueToChannelPublishQueueMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useRunPublishOrchestrationMutation = (
  options?: UseMutationOptions<
    { runPublishOrchestration: PublishOrchestrationResult },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runPublishOrchestration: PublishOrchestrationResult }>(
        runPublishOrchestrationMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useEnqueueTrendScoutJobMutation = (
  options?: UseMutationOptions<
    { enqueueTrendScoutJob: EnqueueTrendScoutJobResult },
    Error,
    { channelId?: string; dryRun?: boolean }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      const payload: { channelId?: string; dryRun?: boolean } = {};
      if (input.channelId?.trim()) {
        payload.channelId = input.channelId.trim();
      }
      if (input.dryRun === true) {
        payload.dryRun = true;
      }
      return gql<{ enqueueTrendScoutJob: EnqueueTrendScoutJobResult }>(
        enqueueTrendScoutJobMutation,
        { input: payload },
      );
    },
    ...options,
  });
};

export const useContentPublishDraftQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      ContentPublishDraftGql | null,
      Error,
      ContentPublishDraftGql | null,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["contentPublishDraft", vars.jobId],
    queryFn: async () => {
      const data = await gql<{
        contentPublishDraft: ContentPublishDraftGql | null;
      }>(contentPublishDraftQuery, vars);
      return data.contentPublishDraft ?? null;
    },
    enabled: Boolean(vars.jobId),
    ...options,
  });
};

export const usePublishTargetsForJobQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      PublishTarget[],
      Error,
      PublishTarget[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["publishTargetsForJob", vars.jobId],
    queryFn: async () => {
      const data = await gql<{ publishTargetsForJob: PublishTarget[] }>(
        publishTargetsForJobQuery,
        vars,
      );
      return data.publishTargetsForJob ?? [];
    },
    enabled: Boolean(vars.jobId),
    ...options,
  });
};

export const useSourceItemQuery = (
  vars: { id: string },
  options?: Omit<
    UseQueryOptions<
      SourceItemGql | null,
      Error,
      SourceItemGql | null,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["sourceItem", vars.id],
    queryFn: async () => {
      const data = await gql<{ sourceItem: SourceItemGql | null }>(
        sourceItemQuery,
        vars,
      );
      return data.sourceItem ?? null;
    },
    enabled: Boolean(vars.id),
    ...options,
  });
};

export const useSourceItemsForChannelQuery = (
  vars: { channelId: string },
  options?: Omit<
    UseQueryOptions<
      SourceItemGql[],
      Error,
      SourceItemGql[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["sourceItemsForChannel", vars.channelId],
    queryFn: async () => {
      const data = await gql<{ sourceItemsForChannel: SourceItemGql[] }>(
        sourceItemsForChannelQuery,
        vars,
      );
      return data.sourceItemsForChannel ?? [];
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const useIdeaCandidatesForChannelQuery = (
  vars: { channelId: string },
  options?: Omit<
    UseQueryOptions<
      IdeaCandidateGql[],
      Error,
      IdeaCandidateGql[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["ideaCandidatesForChannel", vars.channelId],
    queryFn: async () => {
      const data = await gql<{
        ideaCandidatesForChannel: IdeaCandidateGql[];
      }>(ideaCandidatesForChannelQuery, vars);
      return data.ideaCandidatesForChannel ?? [];
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const useChannelAgentConfigQuery = (
  vars: { channelId: string },
  options?: Omit<
    UseQueryOptions<
      ChannelAgentConfigGql,
      Error,
      ChannelAgentConfigGql,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["channelAgentConfig", vars.channelId],
    queryFn: async () => {
      const data = await gql<{ channelAgentConfig: ChannelAgentConfigGql }>(
        channelAgentConfigQuery,
        vars,
      );
      return data.channelAgentConfig;
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const useChannelWatchlistQuery = (
  vars: { channelId: string },
  options?: Omit<
    UseQueryOptions<
      ChannelWatchlistEntryGql[],
      Error,
      ChannelWatchlistEntryGql[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["channelWatchlist", vars.channelId],
    queryFn: async () => {
      const data = await gql<{ channelWatchlist: ChannelWatchlistEntryGql[] }>(
        channelWatchlistQuery,
        vars,
      );
      return data.channelWatchlist ?? [];
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const useLatestChannelScoreSnapshotsForChannelQuery = (
  vars: { channelId: string },
  options?: Omit<
    UseQueryOptions<
      ChannelScoreSnapshotGql[],
      Error,
      ChannelScoreSnapshotGql[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["latestChannelScoreSnapshotsForChannel", vars.channelId],
    queryFn: async () => {
      const data = await gql<{
        latestChannelScoreSnapshotsForChannel: ChannelScoreSnapshotGql[];
      }>(latestChannelScoreSnapshotsForChannelQuery, vars);
      return data.latestChannelScoreSnapshotsForChannel ?? [];
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const useAgentRunsForChannelQuery = (
  vars: { channelId: string; limit?: number },
  options?: Omit<
    UseQueryOptions<AgentRunGql[], Error, AgentRunGql[], readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["agentRunsForChannel", vars.channelId, vars.limit],
    queryFn: async () => {
      const data = await gql<{ agentRunsForChannel: AgentRunGql[] }>(
        agentRunsForChannelQuery,
        vars,
      );
      return data.agentRunsForChannel ?? [];
    },
    enabled: Boolean(vars.channelId),
    ...options,
  });
};

export const usePerformanceInsightsForJobQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      PerformanceInsightGql[],
      Error,
      PerformanceInsightGql[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["performanceInsightsForJob", vars.jobId],
    queryFn: async () => {
      const data = await gql<{
        performanceInsightsForJob: PerformanceInsightGql[];
      }>(performanceInsightsForJobQuery, vars);
      return data.performanceInsightsForJob ?? [];
    },
    enabled: Boolean(vars.jobId),
    ...options,
  });
};

export const usePromoteIdeaCandidateToSourceMutation = (
  options?: UseMutationOptions<
    { promoteIdeaCandidateToSource: IdeaCandidateGql },
    Error,
    { ideaCandidateId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ promoteIdeaCandidateToSource: IdeaCandidateGql }>(
        promoteIdeaCandidateToSourceMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useRejectIdeaCandidateMutation = (
  options?: UseMutationOptions<
    {
      rejectIdeaCandidate: Pick<
        IdeaCandidateGql,
        "id" | "status" | "updatedAt"
      >;
    },
    Error,
    { ideaCandidateId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{
        rejectIdeaCandidate: Pick<
          IdeaCandidateGql,
          "id" | "status" | "updatedAt"
        >;
      }>(rejectIdeaCandidateMutation, { input });
    },
    ...options,
  });
};

export const useUpdateChannelAgentConfigMutation = (
  options?: UseMutationOptions<
    { updateChannelAgentConfig: ChannelAgentConfigGql },
    Error,
    {
      channelId: string;
      scoutPolicyJson?: unknown;
      automationJson?: unknown;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      const { channelId, scoutPolicyJson, automationJson } = input;
      return gql<{ updateChannelAgentConfig: ChannelAgentConfigGql }>(
        updateChannelAgentConfigMutation,
        {
          input: { channelId, scoutPolicyJson, automationJson },
        },
      );
    },
    ...options,
  });
};

export const useCreateChannelWatchlistEntryMutation = (
  options?: UseMutationOptions<
    { createChannelWatchlistEntry: ChannelWatchlistEntryGql },
    Error,
    {
      channelId: string;
      platform: "YOUTUBE";
      externalChannelId: string;
      source?: "AUTO_DISCOVERED" | "MANUAL";
      priority?: number;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createChannelWatchlistEntry: ChannelWatchlistEntryGql }>(
        createChannelWatchlistEntryMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useUpdateChannelWatchlistEntryMutation = (
  options?: UseMutationOptions<
    { updateChannelWatchlistEntry: ChannelWatchlistEntryGql },
    Error,
    {
      watchlistId: string;
      status?: "WATCHING" | "PAUSED" | "ARCHIVED";
      priority?: number;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateChannelWatchlistEntry: ChannelWatchlistEntryGql }>(
        updateChannelWatchlistEntryMutation,
        { input },
      );
    },
    ...options,
  });
};

export const usePlatformPublishProfileQuery = (
  vars: { channelId: string; platformConnectionId: string },
  options?: Omit<
    UseQueryOptions<
      PlatformPublishProfileGql | null,
      Error,
      PlatformPublishProfileGql | null,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: [
      "platformPublishProfile",
      vars.channelId,
      vars.platformConnectionId,
    ],
    queryFn: async () => {
      const data = await gql<{
        platformPublishProfile: PlatformPublishProfileGql | null;
      }>(platformPublishProfileQuery, vars);
      return data.platformPublishProfile ?? null;
    },
    enabled: Boolean(vars.channelId) && Boolean(vars.platformConnectionId),
    ...options,
  });
};

export const useCreateSourceItemMutation = (
  options?: UseMutationOptions<
    { createSourceItem: SourceItemGql },
    Error,
    {
      channelId: string;
      topic: string;
      masterHook?: string;
      sourceNotes?: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createSourceItem: SourceItemGql }>(
        createSourceItemMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useSetJobSourceItemMutation = (
  options?: UseMutationOptions<
    { setJobSourceItem: AdminJob },
    Error,
    { jobId: string; sourceItemId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ setJobSourceItem: AdminJob }>(setJobSourceItemMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useUpsertPlatformConnectionMutation = (
  options?: UseMutationOptions<
    { upsertPlatformConnection: PlatformConnection },
    Error,
    {
      channelId: string;
      platformConnectionId?: string;
      platform: PublishPlatform;
      accountId: string;
      accountHandle?: string;
      oauthAccountId: string;
      status: PlatformConnectionStatus;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ upsertPlatformConnection: PlatformConnection }>(
        upsertPlatformConnectionMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useUpdateContentPublishDraftMutation = (
  options?: UseMutationOptions<
    { updateContentPublishDraft: ContentPublishDraftGql },
    Error,
    { draft: Record<string, unknown> }
  >,
) => {
  return useMutation({
    mutationFn: async (variables) => {
      return gql<{ updateContentPublishDraft: ContentPublishDraftGql }>(
        updateContentPublishDraftMutation,
        { input: { draft: variables.draft } },
      );
    },
    ...options,
  });
};

export const useSubmitReviewDecisionMutation = (
  options?: UseMutationOptions<
    {
      submitReviewDecision: {
        ok: boolean;
        status: string;
        targetSceneId?: number | null;
      };
    },
    Error,
    {
      jobId: string;
      action: "APPROVE" | "REJECT" | "REGENERATE";
      regenerationScope?: string;
      targetSceneId?: number;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{
        submitReviewDecision: {
          ok: boolean;
          status: string;
          targetSceneId?: number | null;
        };
      }>(submitReviewMutation, { input });
    },
    ...options,
  });
};

export const useRequestUploadMutation = (
  options?: UseMutationOptions<
    { requestUpload: { ok: boolean; status: string } },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ requestUpload: { ok: boolean; status: string } }>(
        requestUploadMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useUpdateLlmStepSettingsMutation = (
  options?: UseMutationOptions<
    { updateLlmStepSettings: LlmStepSettings },
    Error,
    {
      stepKey: string;
      provider: LlmProvider;
      model: string;
      temperature: number;
      maxOutputTokens?: number;
      secretIdEnvVar: string;
      promptVersion: string;
      systemPrompt: string;
      userPrompt: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateLlmStepSettings: LlmStepSettings }>(
        updateLlmStepSettingsMutation,
        { input },
      );
    },
    ...options,
  });
};

export type CreateContentMutationInput = {
  label: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
};

export type UpdateContentMutationInput = {
  contentId: string;
  label?: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
  clearYoutubePublish?: boolean;
};

export const useCreateContentMutation = (
  options?: UseMutationOptions<
    { createContent: AdminContent },
    Error,
    CreateContentMutationInput
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createContent: AdminContent }>(createContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useUpdateContentMutation = (
  options?: UseMutationOptions<
    { updateContent: AdminContent },
    Error,
    UpdateContentMutationInput
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateContent: AdminContent }>(updateContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useDeleteContentMutation = (
  options?: UseMutationOptions<
    { deleteContent: { ok: boolean; contentId: string } },
    Error,
    { contentId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ deleteContent: { ok: boolean; contentId: string } }>(
        deleteContentMutation,
        input,
      );
    },
    ...options,
  });
};

const buildCreateDraftJobVariables = (input: {
  contentId?: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  runTopicPlan?: boolean;
}): { input: Record<string, unknown> } => {
  const payload: Record<string, unknown> = {
    targetLanguage: input.targetLanguage,
    titleIdea: input.titleIdea,
    targetDurationSec: input.targetDurationSec,
    stylePreset: input.stylePreset,
  };
  const cid = input.contentId;
  if (cid != null && String(cid).trim() !== "") {
    payload.contentId = String(cid).trim();
  }
  if (
    input.creativeBrief != null &&
    String(input.creativeBrief).trim() !== ""
  ) {
    payload.creativeBrief = String(input.creativeBrief).trim();
  }
  if (input.autoPublish !== undefined) {
    payload.autoPublish = input.autoPublish;
  }
  if (input.publishAt != null && String(input.publishAt).trim() !== "") {
    payload.publishAt = input.publishAt;
  }
  if (input.runTopicPlan !== undefined) {
    payload.runTopicPlan = input.runTopicPlan;
  }
  return { input: payload };
};

export const useCreateDraftJobMutation = (
  options?: UseMutationOptions<
    { createDraftJob: AdminJob },
    Error,
    {
      contentId?: string;
      targetLanguage: string;
      titleIdea: string;
      targetDurationSec: number;
      stylePreset: string;
      creativeBrief?: string;
      autoPublish?: boolean;
      publishAt?: string;
      /** false면 시드만 두고 DRAFT 유지. 생략 시 백엔드에서 토픽 플랜까지 실행. */
      runTopicPlan?: boolean;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createDraftJob: AdminJob }>(
        createDraftJobMutation,
        buildCreateDraftJobVariables(input),
      );
    },
    ...options,
  });
};

export const useAttachJobToContentMutation = (
  options?: UseMutationOptions<
    { attachJobToContent: AdminJob },
    Error,
    { jobId: string; contentId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ attachJobToContent: AdminJob }>(attachJobToContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useDeleteJobMutation = (
  options?: UseMutationOptions<
    { deleteJob: { ok: boolean; jobId: string } },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ deleteJob: { ok: boolean; jobId: string } }>(
        deleteJobMutation,
        input,
      );
    },
    ...options,
  });
};

export const useUpdateTopicSeedMutation = (
  options?: UseMutationOptions<
    { updateTopicSeed: TopicSeed },
    Error,
    TopicSeed & { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateTopicSeed: TopicSeed }>(updateTopicSeedMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useRunTopicPlanMutation = (
  options?: UseMutationOptions<
    { runTopicPlan: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runTopicPlan: AdminJob }>(runTopicPlanMutation, { input });
    },
    ...options,
  });
};

export const useRunSceneJsonMutation = (
  options?: UseMutationOptions<
    { runSceneJson: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runSceneJson: AdminJob }>(runSceneJsonMutation, { input });
    },
    ...options,
  });
};

export const useUpdateSceneJsonMutation = (
  options?: UseMutationOptions<
    { updateSceneJson: JobDraftDetail },
    Error,
    { jobId: string; sceneJson: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateSceneJson: JobDraftDetail }>(updateSceneJsonMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useRunAssetGenerationMutation = (
  options?: UseMutationOptions<
    { runAssetGeneration: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runAssetGeneration: AdminJob }>(runAssetGenerationMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useApprovePipelineExecutionMutation = (
  options?: UseMutationOptions<
    { approvePipelineExecution: AdminJob },
    Error,
    { jobId: string; executionId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ approvePipelineExecution: AdminJob }>(
        approvePipelineExecutionMutation,
        { input },
      );
    },
    ...options,
  });
};
