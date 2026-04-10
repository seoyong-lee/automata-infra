import { google } from "googleapis";
import { z } from "zod";

export const youtubeOAuthSecretSchema = z
  .object({
    client_id: z.string().trim().min(1),
    client_secret: z.string().trim().min(1),
    refresh_token: z.string().trim().min(1),
    youtube_channel_id: z.string().trim().min(1).optional(),
  })
  .strict();

export type YoutubeOAuthSecret = z.infer<typeof youtubeOAuthSecretSchema>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * `channels.list(mine:true)` 등 사용자 채널 조회용.
 * Data API 전용 시크릿 `{ apiKey }` 는 거부하고, 동일 객체에 `apiKey`가 섞여 있으면 제거 후 OAuth만 검증한다.
 */
const withoutApiKeyField = (
  record: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "apiKey"),
  );

export const parseYoutubeOAuthSecret = (raw: unknown): YoutubeOAuthSecret => {
  const normalized = isPlainRecord(raw) ? withoutApiKeyField(raw) : raw;

  const parsed = youtubeOAuthSecretSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  const hadApiKeyOnly =
    isPlainRecord(raw) &&
    typeof raw.apiKey === "string" &&
    raw.apiKey.trim().length > 0 &&
    typeof raw.client_id !== "string" &&
    typeof raw.client_secret !== "string" &&
    typeof raw.refresh_token !== "string";

  if (hadApiKeyOnly) {
    throw new Error(
      "This Secrets Manager value is a YouTube Data API key only ({ apiKey }). " +
        "To list channels you need OAuth credentials JSON: client_id, client_secret, refresh_token " +
        "(the same secret shape used for YouTube upload / channel OAuth), not the Data API key secret.",
    );
  }

  throw new Error(
    "Invalid YouTube OAuth secret: JSON must include non-empty client_id, client_secret, and refresh_token.",
  );
};

export const createYoutubeDataClient = (secret: YoutubeOAuthSecret) => {
  const auth = new google.auth.OAuth2(secret.client_id, secret.client_secret);
  auth.setCredentials({
    refresh_token: secret.refresh_token,
  });
  return google.youtube({
    version: "v3",
    auth,
  });
};
