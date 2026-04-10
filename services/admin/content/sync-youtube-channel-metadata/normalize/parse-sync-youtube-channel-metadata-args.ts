import { syncYoutubeChannelMetadataInputSchema } from "../../../../shared/lib/contracts/youtube-channel-publish";
import { badUserInput } from "../../../shared/errors";

export const parseSyncYoutubeChannelMetadataArgs = (
  args: Record<string, unknown>,
): { contentId: string } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return syncYoutubeChannelMetadataInputSchema.parse(input);
  } catch {
    throw badUserInput("syncYoutubeChannelMetadata input is invalid");
  }
};
