import { badUserInput } from "../../shared/errors";
import type { UpdateContentInputDto } from "../../shared/types";
import { parseUpdateContentInput } from "../../../../shared/lib/contracts/canonical-io-schemas";

export const parseUpdateContentArgs = (
  args: Record<string, unknown>,
): { draft: UpdateContentInputDto } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    const parsed = parseUpdateContentInput(input);
    return { draft: parsed };
  } catch {
    throw badUserInput("updateContent input is invalid");
  }
};
