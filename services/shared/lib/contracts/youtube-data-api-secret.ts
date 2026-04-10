import { z } from "zod";

/** Secrets Manager JSON for shared YouTube Data API v3 project API key (not OAuth). */
export const youtubeDataApiSecretSchema = z
  .object({
    apiKey: z.string().trim().min(1),
  })
  .strict();

export type YoutubeDataApiSecret = z.infer<typeof youtubeDataApiSecretSchema>;
