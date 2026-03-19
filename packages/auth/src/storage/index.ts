import "client-only";

export type Tokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
};

const KEY = "ai-pipeline.tokens.v1";

export const saveTokens = (t: Omit<Tokens, "expiresAt">) => {
  const expiresAt = Date.now() + t.expiresIn * 1000 - 30_000;
  const next: Tokens = { ...t, expiresAt };
  localStorage.setItem(KEY, JSON.stringify(next));
};

export const loadTokens = (): Tokens | null => {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
};

export const clearTokens = () => {
  localStorage.removeItem(KEY);
};
