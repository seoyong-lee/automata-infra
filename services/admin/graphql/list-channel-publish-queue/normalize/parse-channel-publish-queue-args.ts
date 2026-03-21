import { badUserInput } from "../../shared/errors";

export const parseChannelPublishQueueArgs = (
  args: Record<string, unknown>,
): { contentId: string } => {
  const contentId =
    typeof args.contentId === "string" ? args.contentId.trim() : "";
  if (!contentId) {
    throw badUserInput("contentId is required");
  }
  return { contentId };
};
