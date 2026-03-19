type GraphqlIdentity = {
  claims?: Record<string, unknown>;
  username?: string;
};

export const getIdentityClaims = (
  identity: unknown,
): Record<string, unknown> => {
  if (!identity || typeof identity !== "object") {
    return {};
  }
  const claims = (identity as GraphqlIdentity).claims;
  if (!claims || typeof claims !== "object") {
    return {};
  }
  return claims;
};

export const getActor = (identity: unknown): string => {
  if (!identity || typeof identity !== "object") {
    return "unknown";
  }
  const typed = identity as GraphqlIdentity;
  const claims = getIdentityClaims(identity);
  const email = claims.email;
  if (typeof email === "string" && email.length > 0) {
    return email;
  }
  return typed.username ?? "unknown";
};

const readGroups = (claims: Record<string, unknown>): string[] => {
  const groups = claims["cognito:groups"];
  if (Array.isArray(groups)) {
    return groups.filter((v): v is string => typeof v === "string");
  }
  if (typeof groups === "string") {
    return groups
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

export const assertAdminGroup = (identity: unknown): void => {
  const claims = getIdentityClaims(identity);
  const groups = readGroups(claims);
  if (!groups.includes("Admin")) {
    throw new Error("forbidden: Admin group required");
  }
};
