import { badUserInput } from "../../../shared/errors";

export const parseDeleteJobArgs = (
  args: Record<string, unknown>,
): { jobId: string } => {
  const jobId = args.jobId;
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw badUserInput("jobId is required");
  }
  return {
    jobId: jobId.trim(),
  };
};
