import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const cancelFinalCompositionInputSchema = z.object({
  jobId: z.string().trim().min(1, "jobId is required"),
  executionId: z.string().trim().min(1).optional(),
});

export type ParsedCancelFinalCompositionArgs = z.infer<
  typeof cancelFinalCompositionInputSchema
>;

export const parseCancelFinalCompositionArgs = (
  args: Record<string, unknown>,
): ParsedCancelFinalCompositionArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = cancelFinalCompositionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(parsed.error.issues[0]?.message ?? "invalid input");
  }
  return parsed.data;
};
