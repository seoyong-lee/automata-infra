import { badUserInput } from "../../../shared/errors";
import type { UpdateJobBriefInputDto } from "../../../shared/types";
import { jobRenderSettingsSchema } from "../../../../shared/lib/contracts/canonical-io-schemas";

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badUserInput(`${field} is required`);
  }
  return value.trim();
};

const asDuration = (value: unknown): number => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw badUserInput("targetDurationSec is invalid");
  }
  return value;
};

const asOptionalCreativeBrief = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw badUserInput("creativeBrief must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > 8000) {
    throw badUserInput("creativeBrief is too long");
  }
  return trimmed;
};

const asOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw badUserInput("optional string field is invalid");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asOptionalRenderSettings = (
  value: unknown,
): UpdateJobBriefInputDto["renderSettings"] => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = jobRenderSettingsSchema.safeParse(value);
  if (!parsed.success) {
    throw badUserInput(
      parsed.error.issues[0]?.message ?? "renderSettings is invalid",
    );
  }
  return parsed.data;
};

export const parseUpdateJobBriefArgs = (
  args: Record<string, unknown>,
): { jobId: string; jobBrief: UpdateJobBriefInputDto } => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const jobId = asString(input.jobId, "jobId");
  return {
    jobId,
    jobBrief: {
      contentId: asString(input.contentId, "contentId"),
      presetId: asOptionalString(input.presetId),
      targetLanguage: asString(input.targetLanguage, "targetLanguage"),
      titleIdea: asString(input.titleIdea, "titleIdea"),
      targetDurationSec: asDuration(input.targetDurationSec),
      ...(asOptionalString(input.stylePreset)
        ? { stylePreset: asOptionalString(input.stylePreset) }
        : {}),
      creativeBrief: asOptionalCreativeBrief(input.creativeBrief),
      ...(input.renderSettings !== undefined
        ? { renderSettings: asOptionalRenderSettings(input.renderSettings) }
        : {}),
    },
  };
};
