import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const clearSceneVideoInputSchema = z
  .object({
    jobId: nonEmpty,
    sceneId: z.number().int().nonnegative(),
  })
  .strict();

export type ClearSceneVideoInput = z.infer<typeof clearSceneVideoInputSchema>;

export const parseClearSceneVideoInput = (payload: unknown): ClearSceneVideoInput => {
  return clearSceneVideoInputSchema.parse(payload);
};
