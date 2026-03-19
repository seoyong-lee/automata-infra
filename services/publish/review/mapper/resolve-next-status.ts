import { ReviewAction } from "../normalize/parse-review-body";

export const resolveNextStatus = (
  action: ReviewAction,
): "APPROVED" | "REJECTED" | "ASSET_GENERATING" => {
  if (action === "reject") {
    return "REJECTED";
  }

  if (action === "regenerate") {
    return "ASSET_GENERATING";
  }

  return "APPROVED";
};
