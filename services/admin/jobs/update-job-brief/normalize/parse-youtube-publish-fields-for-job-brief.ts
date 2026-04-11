import { jobYoutubePublishMetadataSchema } from "../../../../shared/lib/contracts/job-youtube-publish";
import { badUserInput } from "../../../shared/errors";
import type { UpdateJobBriefInputDto } from "../../../shared/types";

type YoutubePublishFieldKeys = keyof Pick<
  UpdateJobBriefInputDto,
  | "youtubePublishTitle"
  | "youtubePublishDescription"
  | "youtubePublishCategoryId"
  | "youtubePublishDefaultLanguage"
>;

const trimToPayload = (
  payload: Record<string, unknown>,
  key:
    | "youtubePublishTitle"
    | "youtubePublishDescription"
    | "youtubePublishDefaultLanguage",
  value: unknown,
): void => {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string") {
    throw badUserInput(`${key} must be a string`);
  }
  const t = value.trim();
  if (t.length > 0) {
    payload[key] = t;
  }
};

const categoryToPayload = (
  payload: Record<string, unknown>,
  value: unknown,
): void => {
  if (value === undefined) {
    return;
  }
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw badUserInput("youtubePublishCategoryId is invalid");
  }
  payload.youtubePublishCategoryId = value;
};

export const parseOptionalYoutubePublishFields = (
  input: Record<string, unknown>,
): Partial<Pick<UpdateJobBriefInputDto, YoutubePublishFieldKeys>> => {
  const payload: Record<string, unknown> = {};
  trimToPayload(payload, "youtubePublishTitle", input.youtubePublishTitle);
  trimToPayload(
    payload,
    "youtubePublishDescription",
    input.youtubePublishDescription,
  );
  categoryToPayload(payload, input.youtubePublishCategoryId);
  trimToPayload(
    payload,
    "youtubePublishDefaultLanguage",
    input.youtubePublishDefaultLanguage,
  );
  if (Object.keys(payload).length === 0) {
    return {};
  }
  const parsed = jobYoutubePublishMetadataSchema.partial().safeParse(payload);
  if (!parsed.success) {
    throw badUserInput(
      parsed.error.issues[0]?.message ?? "youtube publish fields are invalid",
    );
  }
  return parsed.data;
};
