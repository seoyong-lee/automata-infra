import {
  type PushYoutubeChannelToGoogleInput,
  pushYoutubeChannelToGoogleInputSchema,
} from "../../../../shared/lib/contracts/youtube-channel-publish";
import { badUserInput } from "../../../shared/errors";

export const parsePushYoutubeChannelToGoogleArgs = (
  args: Record<string, unknown>,
): PushYoutubeChannelToGoogleInput => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return pushYoutubeChannelToGoogleInputSchema.parse(input);
  } catch {
    throw badUserInput("pushYoutubeChannelToGoogle input is invalid");
  }
};
