import { badUserInput } from "../../../shared/errors";
import { parseCreateVideoTranscriptFromYoutubeInput } from "../../../../shared/lib/contracts/standalone-video-transcript";

export const parseCreateVideoTranscriptFromYoutubeArgs = (
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
    return parseCreateVideoTranscriptFromYoutubeInput(input);
  } catch {
    throw badUserInput("createVideoTranscriptFromYoutube input is invalid");
  }
};
