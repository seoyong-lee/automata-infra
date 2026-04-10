import { listYoutubeChannelsForSecretInputSchema } from "../../../../shared/lib/contracts/youtube-channel-publish";
import { badUserInput } from "../../../shared/errors";

export const parseListYoutubeChannelsForSecretArgs = (
  args: Record<string, unknown>,
): { youtubeSecretName: string } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return listYoutubeChannelsForSecretInputSchema.parse(input);
  } catch {
    throw badUserInput("listYoutubeChannelsForSecret input is invalid");
  }
};
