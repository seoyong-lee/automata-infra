export type VideoFactoryEnvConfig = {
  region: string;
  projectPrefix: string;
  reviewUiDomain: string;
  manageFargateInfra?: boolean;
  fargateRenderClusterArn?: string;
  fargateRenderTaskDefinitionFamily?: string;
  fargateRenderSecurityGroupId?: string;
  fargateRenderSubnetIds?: string[];
  fargateRenderContainerName?: string;
  adminCallbackUrls?: string[];
  adminLogoutUrls?: string[];
  adminUserPoolDomainPrefix?: string;
  enableAdminSignup?: boolean;
  workflowScheduleExpression?: string;
  workflowScheduleEnabled?: boolean;
  /** 토픽 플랜 등 레거시 워크플로 기본 콘텐츠 ID (예: cnt_… 또는 history-en) */
  defaultContentId: string;
  /** @deprecated env/config.json 구버전 키 — defaultContentId로 옮기면 제거 */
  channelId?: string;
  defaultLanguage: string;
  enableFargateComposition: boolean;
  /** When true, composition Lambdas set FARGATE_DEBUG_MP4_BUNDLE for Fargate (extra MP4s under debug/{jobId}/…). */
  fargateDebugMp4Bundle?: boolean;
  byteplusImageSecretId?: string;
  byteplusVideoSecretId?: string;
  pexelsSecretId?: string;
  runwaySecretId: string;
  openAiSecretId: string;
  elevenLabsSecretId: string;
  shotstackSecretId: string;
  googleOAuthSecretId?: string;
  youtubeSecrets?: Record<string, string>;
  channelConfigs?: Record<
    string,
    {
      youtubeSecretName?: string;
      youtubeAccountType?: string;
      autoPublishEnabled?: boolean;
      defaultVisibility?: "private" | "unlisted" | "public";
      defaultCategoryId?: number;
      playlistId?: string;
    }
  >;
};

export type BaseStackProps = {
  projectPrefix: string;
  region: string;
  envConfig: VideoFactoryEnvConfig;
};
