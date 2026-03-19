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
    throw new Error("jobId is required");
  }
  if (!action) {
    throw new Error("action is required");
  }

  return {
    jobId,
    action,
    regenerationScope,
  };
};
