import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseApprovePipelineExecutionArgs } from "./normalize/parse-approve-pipeline-execution-args";
import { approvePipelineExecutionUsecase } from "./usecase/approve-pipeline-execution";

export const run = runAuditedAdminResolver({
  operation: "approvePipelineExecution",
  operationType: "mutation",
  parse: parseApprovePipelineExecutionArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => approvePipelineExecutionUsecase(parsed),
});
