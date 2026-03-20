import { badUserInput } from "../../shared/errors";
import { parseRunTopicPlanInput } from "../../../../shared/lib/contracts/canonical-io-schemas";

export const parseRunTopicPlanArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return parseRunTopicPlanInput(input);
  } catch {
    throw badUserInput("runTopicPlan input is invalid");
  }
};
