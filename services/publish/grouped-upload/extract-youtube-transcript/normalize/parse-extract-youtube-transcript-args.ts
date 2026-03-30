import { parseExtractYoutubeTranscriptInput } from "../../../../shared/lib/contracts/video-transcript";
import { badUserInput } from "../../../../admin/shared/errors";

export const parseExtractYoutubeTranscriptArgs = (
  args: Record<string, unknown>,
) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }

  try {
    return parseExtractYoutubeTranscriptInput(input);
  } catch {
    throw badUserInput("extractYoutubeTranscript input is invalid");
  }
};
