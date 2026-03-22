import { z } from "zod";
import { badUserInput } from "../../shared/errors";

const runFinalCompositionInputSchema = z.object({
  jobId: z.string().trim().min(1, "jobId is required"),
  burnInSubtitles: z.boolean().optional(),
  renderProvider: z.enum(["SHOTSTACK", "FARGATE"]).optional(),
});

export type ParsedRunFinalCompositionArgs = {
  jobId: string;
  burnInSubtitles?: boolean;
  renderProvider?: "SHOTSTACK" | "FARGATE";
};

export const parseRunFinalCompositionArgs = (
  args: Record<string, unknown>,
): ParsedRunFinalCompositionArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = runFinalCompositionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(parsed.error.issues[0]?.message ?? "invalid input");
  }
  return parsed.data;
};
