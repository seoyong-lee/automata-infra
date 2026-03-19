export const parseJobTimelineArgs = (args: Record<string, unknown>) => {
  const jobId = typeof args.jobId === "string" ? args.jobId : "";
  if (!jobId) {
    throw new Error("jobId is required");
  }
  return {
    jobId,
  };
};
