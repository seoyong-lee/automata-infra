const optional = (name: string): string => {
  return process.env[name] ?? "";
};

export const clientEnv = {
  APPSYNC_GRAPHQL_URL: optional("NEXT_PUBLIC_APPSYNC_GRAPHQL_URL"),
  WEB_ORIGIN: optional("NEXT_PUBLIC_WEB_ORIGIN"),
  USER_POOL_ID: optional("NEXT_PUBLIC_COGNITO_USER_POOL_ID"),
  USER_POOL_CLIENT_ID: optional("NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID"),
  USER_POOL_DOMAIN: optional("NEXT_PUBLIC_COGNITO_DOMAIN"),
};

export const assertClientEnv = () => {
  for (const [key, value] of Object.entries(clientEnv)) {
    if (!value) {
      throw new Error(`Missing client env: ${key}`);
    }
  }
};
