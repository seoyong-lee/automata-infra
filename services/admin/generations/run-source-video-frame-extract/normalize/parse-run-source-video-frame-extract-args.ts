import { badUserInput } from "../../../shared/errors";
import {
  runSourceVideoFrameExtractInputSchema,
  type RunSourceVideoFrameExtractInput,
} from "../../../../shared/lib/contracts/source-video-insight";

export type ParsedRunSourceVideoFrameExtractArgs = RunSourceVideoFrameExtractInput;

export const parseRunSourceVideoFrameExtractArgs = (
  args: Record<string, unknown>,
): ParsedRunSourceVideoFrameExtractArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = runSourceVideoFrameExtractInputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(parsed.error.issues[0]?.message ?? "invalid input");
  }
  return parsed.data;
};
