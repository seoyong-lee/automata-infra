import { badUserInput } from "../../../shared/errors";

export const parseGetJobArgs = (args: Record<string, unknown>) => {
  const jobId = typeof args.jobId === "string" ? args.jobId : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }
  return {
    jobId,
  };
};
