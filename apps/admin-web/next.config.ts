import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@packages/auth", "@packages/graphql", "@packages/theme"],
  turbopack: {},
  env: {
    NEXT_PUBLIC_APPSYNC_GRAPHQL_URL:
      process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL,
    NEXT_PUBLIC_WEB_ORIGIN: process.env.NEXT_PUBLIC_WEB_ORIGIN,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID:
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID:
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  },
};

export default nextConfig;
