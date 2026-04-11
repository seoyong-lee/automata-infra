import type {
  AssetMenuModel,
  ContentPreset,
  PresetSnapshot,
  ResolvedPolicy,
} from "../../shared/lib/contracts/content-presets";
import type {
  JobRenderSettings,
  SceneStartTransition,
  SceneVisualNeed,
} from "../../shared/lib/contracts/canonical-io-schemas";
import type {
  SceneVideoTranscript,
  SceneVideoTranscriptProvider,
  SceneVideoTranscriptStatus,
} from "../../shared/lib/contracts/video-transcript";

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
  /** 사실상 채널 ID. 미연결 잡은 비어 있을 수 있다. */
  contentId?: string;
  status: JobStatus;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetFormat?: string;
  presetDuration?: string;
  presetPlatformPreset?: string;
  autoPublish?: boolean;
  publishAt?: string;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  youtubePublishTitle?: string;
  youtubePublishDescription?: string;
  youtubePublishTags?: string[];
  youtubePublishCategoryId?: number;
  youtubePublishDefaultLanguage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  sceneJsonS3Key?: string;
  assetManifestS3Key?: string;
  renderPlanS3Key?: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  reviewAction?: ReviewAction;
  reviewRequestedAt?: string;
  uploadStatus?: UploadStatus;
  uploadVideoId?: string;
  contentBriefS3Key?: string;
  jobBriefS3Key?: string;
  jobPlanS3Key?: string;
  approvedPlanExecutionId?: string;
  approvedSceneExecutionId?: string;
  approvedAssetExecutionId?: string;
  defaultVoiceProfileId?: string;
  backgroundMusicS3Key?: string;
};

export type RenderArtifactDto = {
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  renderPlanS3Key?: string;
  subtitleAssS3Key?: string;
  provider?: string;
  providerRenderId?: string | null;
  createdAt: string;
  selected: boolean;
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

export type JobBriefDto = {
  contentId: string;
  presetId?: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  /** 자유 서술 기획 메모. Scene JSON 프롬프트에 반영. */
  creativeBrief?: string;
  /** YouTube 업로드용; Scene JSON·LLM으로 채운 뒤 `updateJobBrief`로 저장 */
  youtubePublishTitle?: string;
  youtubePublishDescription?: string;
  youtubePublishCategoryId?: number;
  youtubePublishDefaultLanguage?: string;
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
  renderSettings?: JobRenderSettings;
};

export type ContentBriefDto = {
  jobId: string;
  contentType: string;
  variant: string;
  contentId: string;
  presetId?: string;
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
    ideaKey: string;
  };
  constraints: {
    maxScenes: number;
    mustHaveHook: boolean;
    mustHaveCTA: boolean;
    safetyLevel: "default" | "strict" | "relaxed";
    noMedicalOrLegalClaims: boolean;
  };
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
};

export type CreateDraftJobInputDto = {
  /** 생략 시 미연결 잡(`ADMIN_UNASSIGNED_CONTENT_ID`)으로 생성 */
  contentId?: string;
  presetId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset?: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  /**
   * false가 아니면 잡 생성 직후 플랜 생성까지 실행한다. 생략 시 true와 동일.
   */
  runJobPlan?: boolean;
};

export type UpdateJobBriefInputDto = Omit<JobBriefDto, "stylePreset"> & {
  stylePreset?: string;
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
  youtubeExternalChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeChannelDescription?: string;
  youtubeChannelCustomUrl?: string;
  youtubeChannelKeywords?: string;
  youtubeChannelSyncedAt?: string;
  youtubeDefaultTags?: string[];
  youtubeDefaultLanguage?: string;
  youtubeNotifySubscribers?: boolean;
  youtubeMadeForKids?: boolean;
  youtubeUploadFormat?: "standard" | "shorts";
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
  youtubeExternalChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeChannelDescription?: string;
  youtubeChannelCustomUrl?: string;
  youtubeChannelKeywords?: string;
  youtubeChannelSyncedAt?: string;
  youtubeDefaultTags?: string[];
  youtubeDefaultLanguage?: string;
  youtubeNotifySubscribers?: boolean;
  youtubeMadeForKids?: boolean;
  youtubeUploadFormat?: "standard" | "shorts";
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
  youtubeExternalChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeChannelDescription?: string;
  youtubeChannelCustomUrl?: string;
  youtubeChannelKeywords?: string;
  youtubeChannelSyncedAt?: string;
  youtubeDefaultTags?: string[];
  youtubeDefaultLanguage?: string;
  youtubeNotifySubscribers?: boolean;
  youtubeMadeForKids?: boolean;
  youtubeUploadFormat?: "standard" | "shorts";
};

export type SceneJsonSceneDto = {
  sceneId: number;
  durationSec: number;
  narration: string;
  disableNarration?: boolean;
  imagePrompt: string;
  videoPrompt?: string;
  subtitle: string;
  bgmMood?: string;
  sfx?: string[];
  storyBeat?: string;
  visualNeed?: SceneVisualNeedDto;
  startTransition?: SceneStartTransition;
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
  videoTranscript?: SceneVideoTranscriptDto;
  stockImageSearchStatus?: string;
  stockImageSearchQuery?: string;
  stockVideoSearchStatus?: string;
  stockVideoSearchQuery?: string;
  imageSelectedCandidateId?: string;
  videoSelectedCandidateId?: string;
  voiceSelectedCandidateId?: string;
  voiceProfileId?: string;
  voiceDurationSec?: number;
  durationSec?: number;
  narration?: string;
  subtitle?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  storyBeat?: string;
  visualNeed?: SceneVisualNeedDto;
  validationStatus?: string;
  imageCandidates?: SceneImageCandidateDto[];
  videoCandidates?: SceneVideoCandidateDto[];
  voiceCandidates?: SceneVoiceCandidateDto[];
};

export type SceneVisualNeedDto = SceneVisualNeed;

export type SceneVideoTranscriptDto = SceneVideoTranscript;
export type SceneVideoTranscriptStatusDto = SceneVideoTranscriptStatus;
export type SceneVideoTranscriptProviderDto = SceneVideoTranscriptProvider;

export type VoiceProfileDto = {
  profileId: string;
  label: string;
  provider: string;
  voiceId: string;
  modelId?: string;
  sampleAudioUrl?: string;
  description?: string;
  language?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type BackgroundMusicAssetDto = {
  s3Key: string;
  fileName: string;
  uploadedAt?: string;
  sizeBytes?: number;
};

export type AssetPoolAssetDto = {
  assetId: string;
  assetType: "image" | "video" | "audio";
  sourceType: "pool" | "stock" | "ai" | "internal";
  provider?: string;
  storageKey: string;
  storageUrl?: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  visualTags: string[];
  moodTags: string[];
  matchedTags: string[];
  matchedTagCount: number;
  containsPeople?: boolean;
  containsLogo?: boolean;
  containsText?: boolean;
  containsWatermark?: boolean;
  qualityScore?: number;
  reusabilityScore?: number;
  licenseType?: string;
  creatorName?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  reviewStatus: "approved" | "pending" | "rejected";
  ingestedAt: string;
  updatedAt: string;
};

export type AssetPoolAssetConnectionDto = ConnectionDto<AssetPoolAssetDto>;

export type SceneImageCandidateDto = {
  candidateId: string;
  imageS3Key?: string;
  candidateSource?: string;
  assetPoolAssetId?: string;
  matchScore?: number;
  provider?: string;
  providerLogS3Key?: string;
  promptHash?: string;
  mocked?: boolean;
  sourceUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
  sourceAssetId?: string;
  licenseType?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  width?: number;
  height?: number;
  createdAt: string;
  selected: boolean;
};

export type SceneVideoCandidateDto = {
  candidateId: string;
  videoClipS3Key?: string;
  candidateSource?: string;
  assetPoolAssetId?: string;
  matchScore?: number;
  provider?: string;
  providerLogS3Key?: string;
  promptHash?: string;
  mocked?: boolean;
  sourceUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
  sourceAssetId?: string;
  licenseType?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  width?: number;
  height?: number;
  durationSec?: number;
  createdAt: string;
  selected: boolean;
};

export type SceneVoiceCandidateDto = {
  candidateId: string;
  voiceS3Key: string;
  provider?: string;
  providerLogS3Key?: string;
  mocked?: boolean;
  voiceDurationSec?: number;
  voiceProfileId?: string;
  createdAt: string;
  selected: boolean;
};

export type JobDraftDetailDto = {
  job: AdminJobDto;
  contentBrief?: ContentBriefDto;
  jobBrief?: JobBriefDto;
  jobPlan?: JobBriefDto;
  sceneJson?: SceneJsonDto;
  assets: SceneAssetDto[];
  backgroundMusicOptions: BackgroundMusicAssetDto[];
  assetMenuModel?: AssetMenuModel;
  renderArtifacts: RenderArtifactDto[];
};

export type ContentPresetDto = ContentPreset;
export type PresetSnapshotDto = PresetSnapshot;
export type ResolvedPolicyDto = ResolvedPolicy;
export type AssetMenuModelDto = AssetMenuModel;

export type DeleteContentPresetResultDto = {
  ok: boolean;
  presetId: string;
};
