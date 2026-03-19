export const clientEnv = {
  APPSYNC_GRAPHQL_URL: process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL ?? "",
  WEB_ORIGIN: process.env.NEXT_PUBLIC_WEB_ORIGIN ?? "",
  USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
  USER_POOL_CLIENT_ID:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? "",
  USER_POOL_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
};

export const assertClientEnv = () => {
  for (const [key, value] of Object.entries(clientEnv)) {
    if (!value) {
      throw new Error(`Missing client env: ${key}`);
    }
  }
};
