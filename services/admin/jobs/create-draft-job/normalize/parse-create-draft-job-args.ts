import { badUserInput } from "../../../shared/errors";
import type { CreateDraftJobInputDto } from "../../../shared/types";
import { parseCreateDraftJobInput } from "../../../../shared/lib/contracts/canonical-io-schemas";

export const parseCreateDraftJobArgs = (
  args: Record<string, unknown>,
): { draft: CreateDraftJobInputDto } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  let parsed: CreateDraftJobInputDto;
  try {
    parsed = parseCreateDraftJobInput(input);
  } catch {
    throw badUserInput("createDraftJob input is invalid");
  }

  return {
    draft: parsed,
  };
};
