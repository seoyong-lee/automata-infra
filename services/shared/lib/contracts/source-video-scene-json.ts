import { z } from "zod";

export const sourceVideoVisionCaptionRowSchema = z.object({
  offsetSec: z.number().nonnegative(),
  caption: z.string().trim().min(1).max(4000),
});

export const sourceVideoVisionCaptionsSchema = z.array(
  sourceVideoVisionCaptionRowSchema,
);

export const runSourceVideoSceneJsonInputSchema = z.object({
  jobId: z.string().trim().min(1, "jobId is required"),
  insightResultS3Key: z.string().trim().min(1).optional(),
  /** true면 S3 키·타임스탬프만 넣고 Vision(Bedrock 이미지) 호출 생략 */
  skipVision: z.boolean().optional(),
  /** true면 성공 후에도 샘플 JPEG를 S3에 남긴다(디버그·재시도용). 기본 false = 정리 */
  retainFrameJpegs: z.boolean().optional(),
});

export type RunSourceVideoSceneJsonInput = z.infer<
  typeof runSourceVideoSceneJsonInputSchema
>;
