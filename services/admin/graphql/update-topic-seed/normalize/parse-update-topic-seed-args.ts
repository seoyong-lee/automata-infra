import { badUserInput } from "../../shared/errors";
import type { TopicSeedDto } from "../../shared/types";

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

export const parseUpdateTopicSeedArgs = (
  args: Record<string, unknown>,
): { jobId: string; topicSeed: TopicSeedDto } => {
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
    topicSeed: {
      contentId: asString(input.contentId, "contentId"),
      targetLanguage: asString(input.targetLanguage, "targetLanguage"),
      titleIdea: asString(input.titleIdea, "titleIdea"),
      targetDurationSec: asDuration(input.targetDurationSec),
      stylePreset: asString(input.stylePreset, "stylePreset"),
    },
  };
};
