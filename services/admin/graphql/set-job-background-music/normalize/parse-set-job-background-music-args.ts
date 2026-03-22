import { badUserInput } from "../../shared/errors";

export type ParsedSetJobBackgroundMusicArgs = {
  jobId: string;
  s3Key?: string;
};

export const parseSetJobBackgroundMusicArgs = (
  args: Record<string, unknown>,
): ParsedSetJobBackgroundMusicArgs => {
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

  const s3Key =
    typeof input.s3Key === "string" && input.s3Key.trim().length > 0
      ? input.s3Key.trim()
      : undefined;

  return {
    jobId,
    ...(s3Key ? { s3Key } : {}),
  };
};
