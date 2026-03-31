import { z } from "zod";

import { sceneVideoTranscriptProviderSchema } from "./video-transcript";

const nonEmpty = z.string().trim().min(1);
const urlSchema = z.string().trim().url();

export const standaloneVideoTranscriptStatusSchema = z.enum([
  "AWAITING_UPLOAD",
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
]);

export const standaloneVideoTranscriptSourceTypeSchema = z.enum([
  "UPLOAD",
  "YOUTUBE_URL",
]);

export const standaloneVideoTranscriptSchema = z
  .object({
    transcriptId: nonEmpty,
    status: standaloneVideoTranscriptStatusSchema,
    sourceType: standaloneVideoTranscriptSourceTypeSchema,
    provider: sceneVideoTranscriptProviderSchema,
    sourceS3Key: nonEmpty.optional(),
    sourceUrl: urlSchema.optional(),
    languageCode: nonEmpty.optional(),
    markdown: z.string().optional(),
    plainTextPreview: nonEmpty.optional(),
    providerJobId: nonEmpty.optional(),
    fileName: nonEmpty.optional(),
    contentType: nonEmpty.optional(),
    startedAt: nonEmpty.optional(),
    completedAt: nonEmpty.optional(),
    createdAt: nonEmpty,
    updatedAt: nonEmpty,
    lastError: nonEmpty.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === "UPLOAD" && !value.sourceS3Key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceS3Key is required for upload transcripts",
      });
    }
    if (value.sourceType === "YOUTUBE_URL" && !value.sourceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceUrl is required for youtube transcripts",
      });
    }
  })
  .strict();

export const requestTranscriptUploadInputSchema = z
  .object({
    fileName: nonEmpty,
    contentType: nonEmpty,
  })
  .strict();

export const createVideoTranscriptFromUploadInputSchema = z
  .object({
    transcriptId: nonEmpty,
    s3Key: nonEmpty,
    languageCode: nonEmpty.optional(),
  })
  .strict();

export const createVideoTranscriptFromYoutubeInputSchema = z
  .object({
    youtubeUrl: urlSchema,
    languageCode: nonEmpty.optional(),
  })
  .strict();

export const getTranscriptInputSchema = z
  .object({
    transcriptId: nonEmpty,
  })
  .strict();

export const standaloneVideoTranscriptWorkerEventFromUploadSchema = z
  .object({
    kind: z.literal("UPLOAD_S3"),
    transcriptId: nonEmpty,
    s3Key: nonEmpty,
    preferredLanguage: nonEmpty.optional(),
  })
  .strict();

export const standaloneVideoTranscriptWorkerEventFromYoutubeSchema = z
  .object({
    kind: z.literal("YOUTUBE_URL"),
    transcriptId: nonEmpty,
    youtubeUrl: urlSchema,
    preferredLanguage: nonEmpty.optional(),
  })
  .strict();

export const standaloneVideoTranscriptWorkerEventSchema = z.discriminatedUnion(
  "kind",
  [
    standaloneVideoTranscriptWorkerEventFromUploadSchema,
    standaloneVideoTranscriptWorkerEventFromYoutubeSchema,
  ],
);

export type StandaloneVideoTranscriptStatus = z.infer<
  typeof standaloneVideoTranscriptStatusSchema
>;
export type StandaloneVideoTranscriptSourceType = z.infer<
  typeof standaloneVideoTranscriptSourceTypeSchema
>;
export type StandaloneVideoTranscript = z.infer<
  typeof standaloneVideoTranscriptSchema
>;
export type RequestTranscriptUploadInput = z.infer<
  typeof requestTranscriptUploadInputSchema
>;
export type CreateVideoTranscriptFromUploadInput = z.infer<
  typeof createVideoTranscriptFromUploadInputSchema
>;
export type CreateVideoTranscriptFromYoutubeInput = z.infer<
  typeof createVideoTranscriptFromYoutubeInputSchema
>;
export type GetTranscriptInput = z.infer<typeof getTranscriptInputSchema>;
export type StandaloneVideoTranscriptWorkerEventFromUpload = z.infer<
  typeof standaloneVideoTranscriptWorkerEventFromUploadSchema
>;
export type StandaloneVideoTranscriptWorkerEventFromYoutube = z.infer<
  typeof standaloneVideoTranscriptWorkerEventFromYoutubeSchema
>;
export type StandaloneVideoTranscriptWorkerEvent = z.infer<
  typeof standaloneVideoTranscriptWorkerEventSchema
>;

export const parseStandaloneVideoTranscript = (
  payload: unknown,
): StandaloneVideoTranscript => {
  return standaloneVideoTranscriptSchema.parse(payload);
};

export const parseRequestTranscriptUploadInput = (
  payload: unknown,
): RequestTranscriptUploadInput => {
  return requestTranscriptUploadInputSchema.parse(payload);
};

export const parseCreateVideoTranscriptFromUploadInput = (
  payload: unknown,
): CreateVideoTranscriptFromUploadInput => {
  return createVideoTranscriptFromUploadInputSchema.parse(payload);
};

export const parseCreateVideoTranscriptFromYoutubeInput = (
  payload: unknown,
): CreateVideoTranscriptFromYoutubeInput => {
  return createVideoTranscriptFromYoutubeInputSchema.parse(payload);
};

export const parseGetTranscriptInput = (
  payload: unknown,
): GetTranscriptInput => {
  return getTranscriptInputSchema.parse(payload);
};

export const parseStandaloneVideoTranscriptWorkerEvent = (
  payload: unknown,
): StandaloneVideoTranscriptWorkerEvent => {
  return standaloneVideoTranscriptWorkerEventSchema.parse(payload);
};
