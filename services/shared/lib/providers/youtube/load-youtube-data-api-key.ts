import { youtubeDataApiSecretSchema } from "../../contracts/youtube-data-api-secret";
import { getOptionalEnv, getSecretJson } from "../../aws/runtime";

/**
 * Loads `{ "apiKey": "..." }` from Secrets Manager when `YOUTUBE_DATA_API_SECRET_ID` is set.
 * OAuth 전용 호출에는 필수는 아니며, 일부 요청에서 `key` 쿼리로 프로젝트 쿼터/식별에 쓸 수 있다.
 */
export const loadYoutubeDataApiKey = async (): Promise<string | undefined> => {
  const secretId = getOptionalEnv("YOUTUBE_DATA_API_SECRET_ID")?.trim();
  if (!secretId) {
    return undefined;
  }
  const raw = await getSecretJson<unknown>(secretId);
  if (raw === null) {
    throw new Error(
      `YouTube Data API secret "${secretId}" has no SecretString`,
    );
  }
  const parsed = youtubeDataApiSecretSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `YouTube Data API secret "${secretId}" must be JSON: { "apiKey": "<key>" }`,
    );
  }
  return parsed.data.apiKey;
};
