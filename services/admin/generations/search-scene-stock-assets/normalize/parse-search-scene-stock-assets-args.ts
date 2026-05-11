import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const optionalTrimmedSearchText = z
  .string()
  .trim()
  .max(400)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const searchSceneStockAssetsInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    targetSceneId: z.number().int().nonnegative().optional(),
    sceneId: z.number().int().nonnegative().optional(),
    modality: z.enum(["ALL", "IMAGE", "VIDEO"]).optional(),
    query: optionalTrimmedSearchText,
    pexelsQuery: optionalTrimmedSearchText,
  })
  .strict()
  .transform((data) => ({
    jobId: data.jobId,
    targetSceneId: data.targetSceneId ?? data.sceneId,
    modality: data.modality,
    query: data.query ?? data.pexelsQuery,
  }));

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
