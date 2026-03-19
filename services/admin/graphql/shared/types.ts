export type GraphqlResolverEvent<TArgs> = {
  arguments: TArgs;
  identity?: unknown;
};

export type AdminJobDto = {
  jobId: string;
  channelId: string;
  topicId: string;
  status: string;
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
  reviewAction?: string;
  reviewRequestedAt?: string;
  uploadStatus?: string;
  uploadVideoId?: string;
};
