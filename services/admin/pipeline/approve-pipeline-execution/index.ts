import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseApprovePipelineExecutionArgs } from "./normalize/parse-approve-pipeline-execution-args";
import { approvePipelineExecutionUsecase } from "./usecase/approve-pipeline-execution";

export const run = runAuditedAdminResolver({
  operation: "approvePipelineExecution",
  operationType: "mutation",
  parse: parseApprovePipelineExecutionArgs,
  resolveAuditFields: ({ parsed, result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof approvePipelineExecutionUsecase>>
      | undefined;
    return {
      jobId: resolved?.jobId ?? parsed?.jobId,
    };
  },
  run: async ({ parsed }) => approvePipelineExecutionUsecase(parsed),
});
