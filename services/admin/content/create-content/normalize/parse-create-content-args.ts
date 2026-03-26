import { badUserInput } from "../../../shared/errors";
import type { CreateContentInputDto } from "../../../shared/types";
import { parseCreateContentInput } from "../../../../shared/lib/contracts/canonical-io-schemas";

export const parseCreateContentArgs = (
  args: Record<string, unknown>,
): { draft: CreateContentInputDto } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    const parsed = parseCreateContentInput(input);
    return { draft: parsed };
  } catch {
    throw badUserInput("createContent input is invalid");
  }
};
