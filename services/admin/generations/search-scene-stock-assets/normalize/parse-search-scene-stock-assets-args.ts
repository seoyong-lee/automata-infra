import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const searchSceneStockAssetsInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    targetSceneId: z.number().int().nonnegative().optional(),
    modality: z.enum(["ALL", "IMAGE", "VIDEO"]).optional(),
  })
  .strict();

export type SearchSceneStockAssetsInputDto = z.infer<
  typeof searchSceneStockAssetsInputSchema
>;

export const parseSearchSceneStockAssetsArgs = (
  args: Record<string, unknown>,
): SearchSceneStockAssetsInputDto => {
  const parsed = z
    .object({
      input: searchSceneStockAssetsInputSchema,
    })
    .safeParse(args);
  if (!parsed.success) {
    throw badUserInput("jobId is required");
  }
  return parsed.data.input;
};
