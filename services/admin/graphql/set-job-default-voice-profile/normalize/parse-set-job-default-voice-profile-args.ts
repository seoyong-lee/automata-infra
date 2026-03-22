import { badUserInput } from "../../shared/errors";

export type ParsedSetJobDefaultVoiceProfileArgs = {
  jobId: string;
  profileId?: string;
};

export const parseSetJobDefaultVoiceProfileArgs = (
  args: Record<string, unknown>,
): ParsedSetJobDefaultVoiceProfileArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }

  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }

  const profileId =
    typeof input.profileId === "string" && input.profileId.trim().length > 0
      ? input.profileId.trim()
      : undefined;

  return {
    jobId,
    ...(profileId ? { profileId } : {}),
  };
};
