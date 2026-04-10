import { badUserInput } from "../../../shared/errors";

export type ListChannelPublishQueueParsed = {
  contentId: string;
  limit: number;
};

export const parseChannelPublishQueueArgs = (
  args: Record<string, unknown>,
): ListChannelPublishQueueParsed => {
  const contentId =
    typeof args.contentId === "string" ? args.contentId.trim() : "";
  if (!contentId) {
    throw badUserInput("contentId is required");
  }

  const rawLimit = args.limit;
  const limit =
    typeof rawLimit === "number" && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 50;

  return { contentId, limit };
};
