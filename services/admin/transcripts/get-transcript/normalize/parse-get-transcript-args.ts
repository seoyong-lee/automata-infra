import { badUserInput } from "../../../shared/errors";
import { parseGetTranscriptInput } from "../../../../shared/lib/contracts/standalone-video-transcript";

export const parseGetTranscriptArgs = (args: Record<string, unknown>) => {
  try {
    return parseGetTranscriptInput(args);
  } catch {
    throw badUserInput("getTranscript args are invalid");
  }
};
