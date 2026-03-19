import { badUserInput } from "../../shared/errors";

export const parseSubmitReviewDecisionArgs = (
  args: Record<string, unknown>,
) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : {};

  const jobId = typeof input.jobId === "string" ? input.jobId : "";
  const action = typeof input.action === "string" ? input.action : "";
  const regenerationScope =
    typeof input.regenerationScope === "string"
      ? input.regenerationScope
      : "full";

  if (!jobId) {
    throw badUserInput("jobId is required");
  }
  if (!action) {
    throw badUserInput("action is required");
  }

  return {
    jobId,
    action,
    regenerationScope,
  };
};
