import { badUserInput } from "../../../shared/errors";
import { runSourceVideoSceneJsonInputSchema } from "../../../../shared/lib/contracts/source-video-scene-json";

export const parseRunSourceVideoSceneJsonArgs = (
  args: Record<string, unknown>,
) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = runSourceVideoSceneJsonInputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(parsed.error.issues[0]?.message ?? "invalid input");
  }
  return parsed.data;
};
