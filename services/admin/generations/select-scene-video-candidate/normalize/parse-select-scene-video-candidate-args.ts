import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const selectSceneVideoCandidateInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    sceneId: z.number().int().nonnegative(),
    candidateId: z.string().trim().min(1),
  })
  .strict();

export type SelectSceneVideoCandidateInputDto = z.infer<
  typeof selectSceneVideoCandidateInputSchema
>;

export const parseSelectSceneVideoCandidateArgs = (
  args: Record<string, unknown>,
): SelectSceneVideoCandidateInputDto => {
  const parsed = z
    .object({
      input: selectSceneVideoCandidateInputSchema,
    })
    .safeParse(args);
  if (!parsed.success) {
    throw badUserInput("jobId, sceneId, and candidateId are required");
  }
  return parsed.data.input;
};
