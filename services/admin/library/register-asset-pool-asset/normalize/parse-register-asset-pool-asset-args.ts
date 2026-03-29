import { parseRegisterAssetPoolAssetInput } from "../../../../shared/lib/contracts/admin-asset-pool";
import { badUserInput } from "../../../shared/errors";

export const parseRegisterAssetPoolAssetArgs = (
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
    return parseRegisterAssetPoolAssetInput(input);
  } catch {
    throw badUserInput("registerAssetPoolAsset input is invalid");
  }
};
