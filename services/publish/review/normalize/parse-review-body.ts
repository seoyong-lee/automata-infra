export type ReviewAction = "approve" | "reject" | "regenerate";

const normalizeAction = (action: string | undefined): ReviewAction => {
  if (action === "reject" || action === "regenerate") {
    return action;
  }

  return "approve";
};

export const parseReviewBody = (
  body: string | null,
): {
  jobId: string | null;
  action: ReviewAction;
  regenerationScope: string;
} => {
  const payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};
  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;
  const action = normalizeAction(
    typeof payload.action === "string" ? payload.action : undefined,
  );
  const regenerationScope =
    typeof payload.regenerationScope === "string"
      ? payload.regenerationScope
      : "full";

  return {
    jobId,
    action,
    regenerationScope,
  };
};
