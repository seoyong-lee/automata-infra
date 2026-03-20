import { badUserInput } from "../../shared/errors";

export const parseRunAssetGenerationArgs = (args: Record<string, unknown>) => {
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
  return { jobId };
};
