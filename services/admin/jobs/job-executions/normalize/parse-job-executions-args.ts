import { badUserInput } from "../../../shared/errors";

export const parseJobExecutionsArgs = (args: Record<string, unknown>) => {
  const jobId = typeof args.jobId === "string" ? args.jobId.trim() : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }
  return { jobId };
};
