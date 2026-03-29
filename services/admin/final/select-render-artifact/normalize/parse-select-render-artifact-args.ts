import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const selectRenderArtifactInputSchema = z.object({
  jobId: z.string().trim().min(1, "jobId is required"),
  createdAt: z.string().trim().min(1, "createdAt is required"),
});

export type ParsedSelectRenderArtifactArgs = z.infer<
  typeof selectRenderArtifactInputSchema
>;

export const parseSelectRenderArtifactArgs = (
  args: Record<string, unknown>,
): ParsedSelectRenderArtifactArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = selectRenderArtifactInputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(parsed.error.issues[0]?.message ?? "invalid input");
  }
  return parsed.data;
};
