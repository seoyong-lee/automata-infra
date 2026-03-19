export const parseRequestUploadArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : {};
  const jobId = typeof input.jobId === "string" ? input.jobId : "";
  if (!jobId) {
    throw new Error("jobId is required");
  }
  return {
    jobId,
  };
};
