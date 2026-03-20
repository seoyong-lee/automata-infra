export type VideoFactoryEnvConfig = {
  region: string;
  projectPrefix: string;
  reviewUiDomain: string;
  adminCallbackUrls?: string[];
  adminLogoutUrls?: string[];
  adminUserPoolDomainPrefix?: string;
  enableAdminSignup?: boolean;
  workflowScheduleExpression?: string;
  workflowScheduleEnabled?: boolean;
  channelId: string;
  defaultLanguage: string;
  enableFargateComposition: boolean;
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
