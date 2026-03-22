import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import {
  parseRunAssetGenerationArgs,
  type ParsedRunAssetGenerationArgs,
} from "./normalize/parse-run-asset-generation-args";
import {
  runAdminAssetGeneration,
  toAssetGenerationScope,
} from "./usecase/run-asset-generation";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed: ParsedRunAssetGenerationArgs = parseRunAssetGenerationArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "runAssetGeneration",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const scope = toAssetGenerationScope(parsed);
    const result = await runAdminAssetGeneration(parsed.jobId, actor, scope);
    logResolverAudit({
      operation: "runAssetGeneration",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "runAssetGeneration",
      operationType: "mutation",
      phase: "failed",
      actor,
      jobId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
