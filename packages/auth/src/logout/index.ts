import { getAuthConfig } from "../config";
import { clearSession } from "../session";

export const logout = () => {
  clearSession();
  const { userPoolClientId, userPoolDomain, webOrigin } = getAuthConfig();
  const url = new URL(`https://${userPoolDomain}/logout`);
  url.searchParams.set("client_id", userPoolClientId);
  url.searchParams.set("logout_uri", `${webOrigin}/login`);
  window.location.href = url.toString();
};
