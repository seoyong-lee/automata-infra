export type VideoJobStatus =
  | "PLANNED"
  | "SCENE_JSON_READY"
  | "ASSET_GENERATING"
  | "VALIDATING"
  | "RENDER_PLAN_READY"
  | "RENDERED"
  | "REVIEW_PENDING"
  | "APPROVED"
  | "UPLOADED"
  | "FAILED";

export type VideoJob = {
  jobId: string;
  channelId: string;
  topicId: string;
  status: VideoJobStatus;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  estimatedCost?: number;
  providerCosts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};
