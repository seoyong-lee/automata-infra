export type VideoFactoryEnvConfig = {
  region: string;
  projectPrefix: string;
  reviewUiDomain: string;
  adminUserPoolDomainPrefix?: string;
  enableAdminSignup?: boolean;
  channelId: string;
  defaultLanguage: string;
  enableFargateComposition: boolean;
  runwaySecretId: string;
  openAiSecretId: string;
  elevenLabsSecretId: string;
  shotstackSecretId: string;
};

export type BaseStackProps = {
  projectPrefix: string;
  region: string;
  envConfig: VideoFactoryEnvConfig;
};
