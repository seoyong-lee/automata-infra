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
  | "UPLOAD_QUEUED"
  | "UPLOADED"
  | "FAILED"
  | "METRICS_COLLECTED";

export type ReviewAction = "PENDING" | "APPROVE" | "REJECT" | "REGENERATE";
export type UploadStatus = "QUEUED" | "UPLOADED";
export type LlmProvider = "OPENAI" | "GEMINI" | "BEDROCK";

export type AdminJobDto = {
  jobId: string;
  channelId: string;
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
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

export type ContentBriefDto = {
  jobId: string;
  contentType: string;
  variant: string;
  channelId: string;
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

export type CreateDraftJobInputDto = TopicSeedDto & {
  contentType: string;
  variant: string;
  autoPublish?: boolean;
  publishAt?: string;
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
