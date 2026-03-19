import { getAuthConfig } from "../config";
import { emitUnauthorized } from "../events";
import { isAdminFromToken } from "../jwt";
import { clearTokens, loadTokens, saveTokens } from "../storage";

export const clearSession = () => {
  clearTokens();
};

export const hasStoredSession = (): boolean => {
  return typeof window !== "undefined" && loadTokens() != null;
};

let refreshing: Promise<string | null> | null = null;

const refreshIfNeeded = async (): Promise<string | null> => {
  const tokens = loadTokens();
  if (!tokens?.refreshToken) {
    return null;
  }
  if (tokens.expiresAt && Date.now() < tokens.expiresAt) {
    return tokens.idToken;
  }

  if (!refreshing) {
    refreshing = (async () => {
      const { userPoolClientId, userPoolDomain } = getAuthConfig();
      const body = new URLSearchParams();
      body.set("grant_type", "refresh_token");
      body.set("client_id", userPoolClientId);
      body.set("refresh_token", tokens.refreshToken ?? "");

      const res = await fetch(`https://${userPoolDomain}/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) {
        clearSession();
        emitUnauthorized();
        return null;
      }

      const data = (await res.json()) as {
        access_token: string;
        id_token: string;
        expires_in: number;
        token_type?: string;
      };
      saveTokens({
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: tokens.refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type ?? "Bearer",
      });
      return data.id_token;
    })().finally(() => {
      refreshing = null;
    });
  }

  return refreshing;
};

export const getIdToken = async (): Promise<string | null> => {
  const tokens = loadTokens();
  if (!tokens) {
    return null;
  }
  if (tokens.expiresAt && Date.now() < tokens.expiresAt) {
    return tokens.idToken;
  }
  return refreshIfNeeded();
};

export const isAdmin = async (): Promise<boolean> => {
  const token = await getIdToken();
  if (!token) {
    return false;
  }
  return isAdminFromToken(token);
};
