import { parseCompleteSceneVideoUploadInput } from "../../../../shared/lib/contracts/video-transcript";
import { badUserInput } from "../../../../admin/shared/errors";

export const parseCompleteSceneVideoUploadArgs = (
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
    return parseCompleteSceneVideoUploadInput(input);
  } catch {
    throw badUserInput("completeSceneVideoUpload input is invalid");
  }
};
