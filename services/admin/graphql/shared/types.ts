export type GraphqlResolverEvent<TArgs> = {
  arguments: TArgs;
  identity?: unknown;
};

export type JobStatus =
  | "PLANNED"
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
