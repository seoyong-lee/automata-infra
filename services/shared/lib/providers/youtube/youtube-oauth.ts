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
