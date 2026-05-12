import { z } from "zod";

export const sourceVideoFrameExtractionStrategySchema = z.enum([
  "UNIFORM",
  "SCENE_CUT",
]);
export type SourceVideoFrameExtractionStrategy = z.infer<
  typeof sourceVideoFrameExtractionStrategySchema
>;

/** Fargate frame-extract task가 `RESULT_S3_KEY`에 기록하는 JSON과 동일 계약 */
export const sourceVideoFrameSampleSchema = z.object({
  offsetSec: z.number().nonnegative(),
  imageS3Key: z.string().trim().min(1),
});

/** S3에 보관되는 형태: 씬 JSON 후 JPEG 정리 시 `imageS3Key` 제거 가능 */
export const sourceVideoFrameSampleStoredSchema = z.object({
  offsetSec: z.number().nonnegative(),
  imageS3Key: z.string().trim().min(1).optional(),
});

export const sourceVideoFrameExtractFargateResultSchema = z.object({
  provider: z.string().trim().min(1),
  sourceVideoS3Key: z.string().trim().min(1),
  extractionStrategy: sourceVideoFrameExtractionStrategySchema.optional().default(
    "UNIFORM",
  ),
  sampleIntervalSec: z.number().positive(),
  maxFrames: z.number().int().positive(),
  /** SCENE_CUT: 병합된 컷 후보 시각(최대 64). UNIFORM은 빈 배열 */
  cutTimesSec: z.array(z.number().nonnegative()).max(64).optional().default([]),
  frames: z.array(sourceVideoFrameSampleSchema).min(1),
  extractedAt: z.string().trim().min(1),
});

/** 추출 직후 JSON 또는 JPEG 삭제 후 갱신본 */
export const sourceVideoFrameExtractStoredResultSchema = z.object({
  provider: z.string().trim().min(1),
  sourceVideoS3Key: z.string().trim().min(1),
  extractionStrategy: sourceVideoFrameExtractionStrategySchema.optional().default(
    "UNIFORM",
  ),
  sampleIntervalSec: z.number().positive(),
  maxFrames: z.number().int().positive(),
  cutTimesSec: z.array(z.number().nonnegative()).max(64).optional().default([]),
  frames: z.array(sourceVideoFrameSampleStoredSchema).min(1),
  extractedAt: z.string().trim().min(1),
  /** `runSourceVideoSceneJson` 성공 후 프레임 JPEG 삭제 시각 */
  frameJpegsPurgedAt: z.string().trim().min(1).optional(),
});

export type SourceVideoFrameSample = z.infer<typeof sourceVideoFrameSampleSchema>;
export type SourceVideoFrameExtractFargateResult = z.infer<
  typeof sourceVideoFrameExtractFargateResultSchema
>;
export type SourceVideoFrameExtractStoredResult = z.infer<
  typeof sourceVideoFrameExtractStoredResultSchema
>;

export const sourceVideoFrameExtractResultS3Key = (jobId: string): string =>
  `logs/${jobId}/source-video-insight/frame-extract-result.json`;

export const sourceVideoFrameExtractRequestS3Key = (jobId: string): string =>
  `logs/${jobId}/source-video-insight/frame-extract-request.json`;

export const runSourceVideoFrameExtractInputSchema = z.object({
  jobId: z.string().trim().min(1, "jobId is required"),
  sourceVideoS3Key: z.string().trim().min(1).optional(),
  sampleIntervalSec: z.number().positive().max(30).optional(),
  maxFrames: z.number().int().min(1).max(48).optional(),
  extractionStrategy: sourceVideoFrameExtractionStrategySchema.optional(),
  sceneThreshold: z.number().min(0.12).max(0.85).optional(),
  minSceneGapSec: z.number().min(0.15).max(3).optional(),
});

export type RunSourceVideoFrameExtractInput = z.infer<
  typeof runSourceVideoFrameExtractInputSchema
>;
