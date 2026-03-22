export type GraphqlResolverEvent<TArgs> = {
  arguments: TArgs;
  identity?: unknown;
};

export type JobStatus =
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

export type ChannelPublishQueueItemStatus =
  | "QUEUED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "REMOVED";

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

export type PlatformConnectionDto = {
  platformConnectionId: string;
  channelId: string;
  platform: PublishPlatform;
  accountId: string;
  accountHandle?: string;
  oauthAccountId: string;
  status: PlatformConnectionStatus;
  connectedAt: string;
  lastSyncedAt?: string;
};

export type PublishTargetDto = {
  publishTargetId: string;
  channelContentItemId: string;
  platformConnectionId: string;
  platform: PublishPlatform;
  status: PublishTargetStatus;
  scheduledAt?: string;
  externalPostId?: string;
  externalUrl?: string;
  publishError?: string;
};

export type ChannelPublishQueueItemDto = {
  queueItemId: string;
  channelId: string;
  jobId: string;
  /** 문서상 ChannelContentItem id; 현재는 jobId와 동일. */
  channelContentItemId: string;
  status: ChannelPublishQueueItemStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  note?: string;
  enqueuedBy?: string;
  publishTargets: PublishTargetDto[];
};

export type ReviewAction = "PENDING" | "APPROVE" | "REJECT" | "REGENERATE";
export type UploadStatus = "QUEUED" | "UPLOADED";
export type LlmProvider = "OPENAI" | "GEMINI" | "BEDROCK";

export type AdminJobDto = {
  jobId: string;
  /** 카탈로그 콘텐츠 ID (레거시 잡은 비어 있을 수 있음) */
  contentId?: string;
  /** 소재(SourceItem) id */
  sourceItemId?: string;
  topicId: string;
  status: JobStatus;
  contentType?: string;
  variant?: string;
  autoPublish?: boolean;
  publishAt?: string;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  sceneJsonS3Key?: string;
  renderPlanS3Key?: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  reviewAction?: ReviewAction;
  reviewRequestedAt?: string;
  uploadStatus?: UploadStatus;
  uploadVideoId?: string;
  contentBriefS3Key?: string;
  topicSeedS3Key?: string;
  topicS3Key?: string;
  approvedTopicExecutionId?: string;
  approvedSceneExecutionId?: string;
  approvedAssetExecutionId?: string;
};

export type ConnectionDto<T> = {
  items: T[];
  nextToken: string | null;
};

export type LlmStepSettingsDto = {
  stepKey: string;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  updatedAt: string;
  updatedBy: string;
};

export type LlmSettingsDto = {
  items: LlmStepSettingsDto[];
};

export type TopicSeedDto = {
  contentId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  /** 자유 서술 기획 메모. Scene JSON 프롬프트에 반영. */
  creativeBrief?: string;
};

export type ContentBriefDto = {
  jobId: string;
  contentType: string;
  variant: string;
  contentId: string;
  language: string;
  targetPlatform: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  autoPublish?: boolean;
  publishAt?: string;
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

export type CreateDraftJobInputDto = {
  /** 생략 시 미연결 잡(`ADMIN_UNASSIGNED_CONTENT_ID`)으로 생성 */
  contentId?: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  /**
   * false가 아니면 잡 생성 직후 토픽 플랜까지 실행한다. 생략 시 true와 동일.
   */
  runTopicPlan?: boolean;
};

export type AttachJobToContentInputDto = {
  jobId: string;
  contentId: string;
};

export type CreateContentInputDto = {
  label: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
};

export type UpdateContentInputDto = {
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

export type ContentDto = {
  contentId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
  youtubeUpdatedAt?: string;
  youtubeUpdatedBy?: string;
};

export type SceneJsonSceneDto = {
  sceneId: number;
  durationSec: number;
  narration: string;
  imagePrompt: string;
  videoPrompt?: string;
  subtitle: string;
  bgmMood?: string;
  sfx?: string[];
};

export type SceneJsonDto = {
  videoTitle: string;
  language: string;
  scenes: SceneJsonSceneDto[];
};

export type SceneAssetDto = {
  sceneId: number;
  imageS3Key?: string;
  videoClipS3Key?: string;
  voiceS3Key?: string;
  durationSec?: number;
  narration?: string;
  subtitle?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  validationStatus?: string;
};

export type JobDraftDetailDto = {
  job: AdminJobDto;
  contentBrief?: ContentBriefDto;
  topicSeed?: TopicSeedDto;
  topicPlan?: TopicSeedDto;
  sceneJson?: SceneJsonDto;
  assets: SceneAssetDto[];
};
