import "client-only";
import { getAuthConfig } from "../config";
import type { Tokens } from "../storage";

const LOGIN_NEXT_KEY = "auth_login_next";

export const consumeLoginNext = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const next = sessionStorage.getItem(LOGIN_NEXT_KEY);
    sessionStorage.removeItem(LOGIN_NEXT_KEY);
    return next;
  } catch {
    return null;
  }
};

const buildRedirectUri = (): string => {
  const { webOrigin } = getAuthConfig();
  const cb = new URL(webOrigin);
  cb.pathname = "/auth/callback";
  return cb.toString();
};

export const startLogin = (params: { next?: string } = {}) => {
  const { userPoolClientId, userPoolDomain } = getAuthConfig();
  if (params.next && params.next !== "/" && typeof window !== "undefined") {
    sessionStorage.setItem(LOGIN_NEXT_KEY, params.next);
  }
  const url = new URL(`https://${userPoolDomain}/oauth2/authorize`);
  url.searchParams.set("client_id", userPoolClientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("redirect_uri", buildRedirectUri());
  window.location.assign(url.toString());
};

export const exchangeTokens = async (code: string): Promise<Tokens> => {
  const { userPoolClientId, userPoolDomain } = getAuthConfig();
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", userPoolClientId);
  body.set("code", code);
  body.set("redirect_uri", buildRedirectUri());

  const res = await fetch(`https://${userPoolDomain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token ?? null,
    tokenType: data.token_type ?? "Bearer",
    expiresIn: data.expires_in,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
};
