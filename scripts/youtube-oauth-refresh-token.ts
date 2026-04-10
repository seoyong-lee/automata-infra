/**
 * 로컬에서 Google OAuth 동의 후 YouTube용 refresh_token을 받는다.
 *
 * 사전 준비
 * - Google Cloud: YouTube Data API v3 사용 설정, OAuth 동의 화면, OAuth 클라이언트 생성
 * - 클라이언트가 "데스크톱 앱"이면 리디렉션에 보통 `http://127.0.0.1` 계열 허용
 * - "웹 애플리케이션"이면 아래 REDIRECT_URI와 **완전히 동일한 문자열**을
 *   "승인된 리디렉션 URI"에 추가해야 한다.
 *
 * Usage:
 *   export GOOGLE_OAUTH_CLIENT_ID='....apps.googleusercontent.com'
 *   export GOOGLE_OAUTH_CLIENT_SECRET='GOCSPX-...'
 *   yarn ts-node scripts/youtube-oauth-refresh-token.ts
 *
 * Optional env:
 *   OAUTH_CALLBACK_PORT (default 8765)
 *   OAUTH_REDIRECT_URI (default http://127.0.0.1:{port}/oauth2callback)
 *   YOUTUBE_OAUTH_SCOPES — 쉼표 구분, 기본 https://www.googleapis.com/auth/youtube
 */
import * as http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const DEFAULT_PORT = 8765;
const explicitRedirect = process.env.OAUTH_REDIRECT_URI?.trim();
const envPort = process.env.OAUTH_CALLBACK_PORT?.trim();

const resolveListenPort = (): number => {
  if (envPort) {
    return Number(envPort);
  }
  if (explicitRedirect) {
    try {
      const u = new URL(explicitRedirect);
      if (u.port) {
        return Number(u.port);
      }
    } catch {
      /* use default */
    }
  }
  return DEFAULT_PORT;
};

const PORT = resolveListenPort();
const REDIRECT_URI =
  explicitRedirect || `http://127.0.0.1:${PORT}/oauth2callback`;

const SCOPES = (
  process.env.YOUTUBE_OAUTH_SCOPES ?? "https://www.googleapis.com/auth/youtube"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const requireEnv = (name: string): string => {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
};

const buildSecretJson = (input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) =>
  JSON.stringify(
    {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
    },
    null,
    2,
  );

const waitForOAuthCallback = (input: {
  port: number;
  redirectPath: string;
  onCode: (code: string) => Promise<void>;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? "/", `http://127.0.0.1:${input.port}`);
          if (url.pathname !== input.redirectPath) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          const err = url.searchParams.get("error");
          if (err) {
            const desc = url.searchParams.get("error_description") ?? "";
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(`OAuth error: ${err} ${desc}`);
            server.close();
            reject(new Error(`OAuth error: ${err} ${desc}`));
            return;
          }
          const code = url.searchParams.get("code");
          if (!code) {
            res.writeHead(400);
            res.end("Missing ?code=");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            "<html><body><p>Authorization received. You can close this tab.</p></body></html>",
          );
          server.close();
          await input.onCode(code);
          resolve();
        } catch (e) {
          server.close();
          reject(e);
        }
      })();
    });

    server.listen(input.port, "127.0.0.1", () => {
      console.info(
        `Listening on http://127.0.0.1:${input.port}${input.redirectPath}`,
      );
    });

    server.on("error", reject);
  });

const run = async () => {
  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");

  const redirectUrl = new URL(REDIRECT_URI);
  if (
    redirectUrl.hostname !== "127.0.0.1" &&
    redirectUrl.hostname !== "localhost"
  ) {
    console.error(
      "Use a loopback redirect URI (http://127.0.0.1:PORT/...) and register it exactly in Google Cloud.",
    );
    process.exit(1);
  }
  const redirectPath =
    redirectUrl.pathname && redirectUrl.pathname !== ""
      ? redirectUrl.pathname
      : "/";

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
  });

  console.info(
    "\nOpen this URL in a browser (logged into the right Google account):\n",
  );
  console.info(authUrl);
  console.info("\nWaiting for redirect…\n");

  await waitForOAuthCallback({
    port: PORT,
    redirectPath,
    onCode: async (code) => {
      const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: REDIRECT_URI,
      });
      const refresh = tokens.refresh_token?.trim();
      if (!refresh) {
        console.warn(
          "No refresh_token in response. Try again with a Google account that has not approved this app yet, or keep prompt=consent (already set).",
        );
        console.info("Raw tokens:", JSON.stringify(tokens, null, 2));
        return;
      }
      console.info(
        "\n--- Secrets Manager style JSON (copy without sharing publicly) ---\n",
      );
      console.info(
        buildSecretJson({
          clientId,
          clientSecret,
          refreshToken: refresh,
        }),
      );
      console.info(
        '\n(Optional) add youtube_channel_id: "UC..." to the JSON for uploads.\n',
      );
    },
  });
};

void run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
