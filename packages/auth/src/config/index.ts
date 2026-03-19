export type AuthConfig = {
  webOrigin: string;
  userPoolId: string;
  userPoolClientId: string;
  userPoolDomain: string;
  logoutClient: "main" | "admin";
};

let config: AuthConfig | null = null;

export const initAuth = (c: AuthConfig) => {
  config = c;
};

export const getAuthConfig = (): AuthConfig => {
  if (!config) {
    throw new Error("Auth not initialized. Call initAuth(config) first.");
  }
  return config;
};
