export type ReviewAction = "approve" | "reject" | "regenerate";

export const mapReviewAction = (action: string): ReviewAction => {
  if (action === "approve" || action === "reject" || action === "regenerate") {
    return action;
  }
  throw new Error("invalid review action");
};
