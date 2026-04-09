import { parseCompleteSceneImageUploadInput } from "../../../../shared/lib/contracts/scene-manual-asset-upload";
import { badUserInput } from "../../../../admin/shared/errors";

export const parseCompleteSceneImageUploadArgs = (
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
    return parseCompleteSceneImageUploadInput(input);
  } catch {
    throw badUserInput("completeSceneImageUpload input is invalid");
  }
};
