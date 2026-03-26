import { badUserInput } from "../../shared/errors";
import { parseRunJobPlanInput } from "../../../../shared/lib/contracts/canonical-io-schemas";

export const parseRunJobPlanArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return parseRunJobPlanInput(input);
  } catch {
    throw badUserInput("runJobPlan input is invalid");
  }
};
