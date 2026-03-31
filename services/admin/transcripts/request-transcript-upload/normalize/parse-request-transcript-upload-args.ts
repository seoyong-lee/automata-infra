import { badUserInput } from "../../../shared/errors";
import { parseRequestTranscriptUploadInput } from "../../../../shared/lib/contracts/standalone-video-transcript";

export const parseRequestTranscriptUploadArgs = (
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
    return parseRequestTranscriptUploadInput(input);
  } catch {
    throw badUserInput("requestTranscriptUpload input is invalid");
  }
};
