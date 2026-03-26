import { badUserInput } from "../../../shared/errors";

export type ApprovePipelineExecutionInputDto = {
  jobId: string;
  executionId: string;
};

export const parseApprovePipelineExecutionArgs = (
  args: Record<string, unknown>,
): ApprovePipelineExecutionInputDto => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  const executionId =
    typeof input.executionId === "string" ? input.executionId.trim() : "";
  if (!jobId || !executionId) {
    throw badUserInput("jobId and executionId are required");
  }
  return { jobId, executionId };
};
