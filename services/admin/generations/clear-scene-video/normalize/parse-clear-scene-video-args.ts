import {
  parseClearSceneVideoInput,
  type ClearSceneVideoInput,
} from "../../../../shared/lib/contracts/clear-scene-video";
import { badUserInput } from "../../../shared/errors";

export const parseClearSceneVideoArgs = (
  args: Record<string, unknown>,
): ClearSceneVideoInput => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return parseClearSceneVideoInput(input);
  } catch {
    throw badUserInput("clearSceneVideo input is invalid");
  }
};
