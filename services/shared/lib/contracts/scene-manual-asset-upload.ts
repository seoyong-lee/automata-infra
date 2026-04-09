import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

/** `requestAssetUpload` SCENE_IMAGE 경로로 올린 객체를 씬 행에 반영할 때 사용 */
export const completeSceneImageUploadInputSchema = z
  .object({
    jobId: nonEmpty,
    sceneId: z.number().int().nonnegative(),
    s3Key: nonEmpty,
  })
  .strict();

export type CompleteSceneImageUploadInput = z.infer<
  typeof completeSceneImageUploadInputSchema
>;

export const parseCompleteSceneImageUploadInput = (
  payload: unknown,
): CompleteSceneImageUploadInput =>
  completeSceneImageUploadInputSchema.parse(payload);
