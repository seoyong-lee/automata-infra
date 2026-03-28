import { badUserInput } from "../../../shared/errors";

export const parseDeleteContentPresetArgs = (args: Record<string, unknown>) => {
  const presetId =
    typeof args.presetId === "string" ? args.presetId.trim() : "";
  if (!presetId) {
    throw badUserInput("presetId is required");
  }
  return { presetId };
};
