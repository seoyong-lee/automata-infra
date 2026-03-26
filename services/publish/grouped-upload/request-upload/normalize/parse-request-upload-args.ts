import { badUserInput } from "../../../../admin/shared/errors";

export const parseRequestUploadArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : {};
  const jobId = typeof input.jobId === "string" ? input.jobId : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }
  return {
    jobId,
  };
};
