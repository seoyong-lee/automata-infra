export const parseJwtPayload = (token: string): Record<string, unknown> => {
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    return {};
  }
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(base64);
  return JSON.parse(json) as Record<string, unknown>;
};

export const isAdminFromToken = (idToken: string): boolean => {
  const payload = parseJwtPayload(idToken);
  const groups = payload["cognito:groups"];
  if (Array.isArray(groups)) {
    return groups.includes("Admin") || groups.includes("admin");
  }
  if (typeof groups === "string") {
    const chunks = groups.split(",").map((v) => v.trim());
    return chunks.includes("Admin") || chunks.includes("admin");
  }
  return false;
};
