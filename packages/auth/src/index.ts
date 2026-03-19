export type { AuthConfig } from "./config";
export { initAuth, getAuthConfig } from "./config";

export type { Tokens } from "./storage";

export { saveTokens, loadTokens, clearTokens } from "./storage";
export { getIdToken, hasStoredSession, isAdmin, clearSession } from "./session";
export { parseJwtPayload, isAdminFromToken } from "./jwt";
export { exchangeTokens, startLogin, consumeLoginNext } from "./client";
export { onAuthEvent, emitUnauthorized } from "./events";
export { initCognito } from "./cognito";
export { logout } from "./logout";
