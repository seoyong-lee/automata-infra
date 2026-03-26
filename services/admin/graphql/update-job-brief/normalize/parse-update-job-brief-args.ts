import { badUserInput } from "../../shared/errors";
import type { JobBriefDto } from "../../shared/types";

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

export const parseUpdateJobBriefArgs = (
  args: Record<string, unknown>,
): { jobId: string; jobBrief: JobBriefDto } => {
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
      targetLanguage: asString(input.targetLanguage, "targetLanguage"),
      titleIdea: asString(input.titleIdea, "titleIdea"),
      targetDurationSec: asDuration(input.targetDurationSec),
      stylePreset: asString(input.stylePreset, "stylePreset"),
      creativeBrief: asOptionalCreativeBrief(input.creativeBrief),
    },
  };
};
