import { badUserInput } from "../../shared/errors";

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badUserInput(`${field} is required`);
  }
  return value.trim();
};

const asOptionalString = (
  value: unknown,
  field: string,
): string | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw badUserInput(`${field} is invalid`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asOptionalBoolean = (
  value: unknown,
  field: string,
): boolean | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const asOptionalNumber = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isInteger(value)
  ) {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const asOptionalVisibility = (
  value: unknown,
): "private" | "unlisted" | "public" | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (value === "private" || value === "unlisted" || value === "public") {
    return value;
  }
  throw badUserInput("defaultVisibility is invalid");
};

export const parseUpsertYoutubeChannelConfigArgs = (
  args: Record<string, unknown>,
) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  return {
    channelId: asString(input.channelId, "channelId"),
    youtubeSecretName: asString(input.youtubeSecretName, "youtubeSecretName"),
    youtubeAccountType: asOptionalString(
      input.youtubeAccountType,
      "youtubeAccountType",
    ),
    autoPublishEnabled: asOptionalBoolean(
      input.autoPublishEnabled,
      "autoPublishEnabled",
    ),
    defaultVisibility: asOptionalVisibility(input.defaultVisibility),
    defaultCategoryId: asOptionalNumber(
      input.defaultCategoryId,
      "defaultCategoryId",
    ),
    playlistId: asOptionalString(input.playlistId, "playlistId"),
  };
};
