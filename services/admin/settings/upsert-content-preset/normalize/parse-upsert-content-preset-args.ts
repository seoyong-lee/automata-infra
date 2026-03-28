import {
  buildContentPresetId,
  parseUpsertContentPresetInput,
} from "../../../../shared/lib/contracts/content-presets";
import { badUserInput } from "../../../shared/errors";

export const parseUpsertContentPresetArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }

  try {
    const parsed = parseUpsertContentPresetInput(input);
    return {
      ...parsed,
      presetId: parsed.presetId ?? buildContentPresetId(),
    };
  } catch {
    throw badUserInput("upsertContentPreset input is invalid");
  }
};
