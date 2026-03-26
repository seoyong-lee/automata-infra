import { parseAttachJobToContentInput } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { badUserInput } from "../../../shared/errors";
import type { AttachJobToContentInputDto } from "../../../shared/types";

export const parseAttachJobToContentArgs = (
  args: Record<string, unknown>,
): AttachJobToContentInputDto => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return parseAttachJobToContentInput(input);
  } catch {
    throw badUserInput("attachJobToContent input is invalid");
  }
};
