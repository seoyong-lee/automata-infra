import { badUserInput } from "../../../shared/errors";
import { parseCreateVideoTranscriptFromUploadInput } from "../../../../shared/lib/contracts/standalone-video-transcript";

export const parseCreateVideoTranscriptFromUploadArgs = (
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
    return parseCreateVideoTranscriptFromUploadInput(input);
  } catch {
    throw badUserInput("createVideoTranscriptFromUpload input is invalid");
  }
};
