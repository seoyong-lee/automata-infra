export type ReviewAction = "approve" | "reject" | "regenerate";

export const mapReviewAction = (action: string): ReviewAction => {
  if (action === "APPROVE") {
    return "approve";
  }
  if (action === "REJECT") {
    return "reject";
  }
  if (action === "REGENERATE") {
    return "regenerate";
  }
  throw new Error("invalid review action");
};
