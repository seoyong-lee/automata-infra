import { badUserInput } from "../../shared/errors";

export const parseDeleteYoutubeChannelConfigArgs = (
  args: Record<string, unknown>,
): { channelId: string } => {
  const channelId = args.channelId;
  if (typeof channelId !== "string" || channelId.trim().length === 0) {
    throw badUserInput("channelId is required");
  }
  return {
    channelId: channelId.trim(),
  };
};
