"use client";

import {
  getIdToken,
  initAuth,
  initCognito,
  onAuthEvent,
  clearSession,
} from "@packages/auth";
import { configureGraphqlClient } from "@packages/graphql";
import { assertClientEnv, clientEnv } from "@/shared/config/env.client";

let initialized = false;

export const initClientApp = () => {
  if (initialized) {
    return;
  }
  assertClientEnv();
  initAuth({
    webOrigin: clientEnv.WEB_ORIGIN,
    userPoolId: clientEnv.USER_POOL_ID,
    userPoolClientId: clientEnv.USER_POOL_CLIENT_ID,
    userPoolDomain: clientEnv.USER_POOL_DOMAIN,
    logoutClient: "admin",
  });
  initCognito();
  configureGraphqlClient({
    url: clientEnv.APPSYNC_GRAPHQL_URL,
    getToken: () => getIdToken(),
    onUnauthorized: () => clearSession(),
  });

  onAuthEvent((e) => {
    if (e.type === "unauthorized") {
      clearSession();
    }
  });

  initialized = true;
};
