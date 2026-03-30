import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const youtubeUrlSchema = z.string().trim().url();

export const sceneVideoTranscriptStatusSchema = z.enum([
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
]);
export const sceneVideoTranscriptProviderSchema = z.enum([
  "AWS_TRANSCRIBE",
  "YT_DLP",
]);

export const sceneVideoTranscriptSegmentSchema = z
  .object({
    startSec: z.number().min(0),
    endSec: z.number().min(0),
    text: nonEmpty,
  })
  .strict();

export const normalizedSceneVideoTranscriptSchema = z
  .object({
    provider: sceneVideoTranscriptProviderSchema,
    providerJobId: nonEmpty,
    sourceS3Key: nonEmpty.optional(),
    sourceUrl: youtubeUrlSchema.optional(),
    languageCode: nonEmpty.optional(),
    text: z.string(),
    segments: z.array(sceneVideoTranscriptSegmentSchema).default([]),
    generatedAt: nonEmpty,
  })
  .refine((value) => !!value.sourceS3Key || !!value.sourceUrl, {
    message: "either sourceS3Key or sourceUrl is required",
  })
  .strict();

export const sceneVideoTranscriptSchema = z
  .object({
    status: sceneVideoTranscriptStatusSchema,
    provider: sceneVideoTranscriptProviderSchema,
    sourceS3Key: nonEmpty.optional(),
    sourceUrl: youtubeUrlSchema.optional(),
    providerJobId: nonEmpty.optional(),
    languageCode: nonEmpty.optional(),
    transcriptJsonS3Key: nonEmpty.optional(),
    transcriptVttS3Key: nonEmpty.optional(),
    transcriptSrtS3Key: nonEmpty.optional(),
    plainTextPreview: nonEmpty.optional(),
    startedAt: nonEmpty.optional(),
    completedAt: nonEmpty.optional(),
    updatedAt: nonEmpty,
    lastError: nonEmpty.optional(),
  })
  .refine((value) => !!value.sourceS3Key || !!value.sourceUrl, {
    message: "either sourceS3Key or sourceUrl is required",
  })
  .strict();

export const completeSceneVideoUploadInputSchema = z
  .object({
    jobId: nonEmpty,
    sceneId: z.number().int().positive(),
    s3Key: nonEmpty,
  })
  .strict();

export const sceneVideoTranscriptWorkerEventSchema = z
  .object({
    jobId: nonEmpty,
    sceneId: z.number().int().positive(),
    s3Key: nonEmpty,
  })
  .strict();

export const extractYoutubeTranscriptInputSchema = z
  .object({
    jobId: nonEmpty,
    sceneId: z.number().int().positive(),
    youtubeUrl: youtubeUrlSchema,
  })
  .strict();

export const sceneVideoTranscriptWorkerEventFromS3Schema = z
  .object({
    kind: z.literal("S3_UPLOAD"),
    jobId: nonEmpty,
    sceneId: z.number().int().positive(),
    s3Key: nonEmpty,
  })
  .strict();

export const sceneVideoTranscriptWorkerEventFromYoutubeSchema = z
  .object({
    kind: z.literal("YOUTUBE_URL"),
    jobId: nonEmpty,
    sceneId: z.number().int().positive(),
    youtubeUrl: youtubeUrlSchema,
    preferredLanguage: nonEmpty.optional(),
  })
  .strict();

export const sceneVideoTranscriptWorkerEventSchemaV2 = z.discriminatedUnion(
  "kind",
  [
    sceneVideoTranscriptWorkerEventFromS3Schema,
    sceneVideoTranscriptWorkerEventFromYoutubeSchema,
  ],
);

export type SceneVideoTranscriptStatus = z.infer<
  typeof sceneVideoTranscriptStatusSchema
>;
export type SceneVideoTranscriptProvider = z.infer<
  typeof sceneVideoTranscriptProviderSchema
>;
export type SceneVideoTranscriptSegment = z.infer<
  typeof sceneVideoTranscriptSegmentSchema
>;
export type NormalizedSceneVideoTranscript = z.infer<
  typeof normalizedSceneVideoTranscriptSchema
>;
export type SceneVideoTranscript = z.infer<typeof sceneVideoTranscriptSchema>;
export type CompleteSceneVideoUploadInput = z.infer<
  typeof completeSceneVideoUploadInputSchema
>;
export type ExtractYoutubeTranscriptInput = z.infer<
  typeof extractYoutubeTranscriptInputSchema
>;
export type SceneVideoTranscriptWorkerEventFromS3 = z.infer<
  typeof sceneVideoTranscriptWorkerEventFromS3Schema
>;
export type SceneVideoTranscriptWorkerEventFromYoutube = z.infer<
  typeof sceneVideoTranscriptWorkerEventFromYoutubeSchema
>;
export type SceneVideoTranscriptWorkerEvent =
  | SceneVideoTranscriptWorkerEventFromS3
  | SceneVideoTranscriptWorkerEventFromYoutube;
export type LegacySceneVideoTranscriptWorkerEvent = z.infer<
  typeof sceneVideoTranscriptWorkerEventSchema
>;

export const parseSceneVideoTranscript = (
  payload: unknown,
): SceneVideoTranscript => {
  return sceneVideoTranscriptSchema.parse(payload);
};

export const parseCompleteSceneVideoUploadInput = (
  payload: unknown,
): CompleteSceneVideoUploadInput => {
  return completeSceneVideoUploadInputSchema.parse(payload);
};

export const parseSceneVideoTranscriptWorkerEvent = (
  payload: unknown,
): SceneVideoTranscriptWorkerEvent => {
  const v2 = sceneVideoTranscriptWorkerEventSchemaV2.safeParse(payload);
  if (v2.success) {
    return v2.data;
  }
  const legacy = sceneVideoTranscriptWorkerEventSchema.parse(payload);
  return {
    kind: "S3_UPLOAD",
    ...legacy,
  };
};

export const parseExtractYoutubeTranscriptInput = (
  payload: unknown,
): ExtractYoutubeTranscriptInput => {
  return extractYoutubeTranscriptInputSchema.parse(payload);
};
