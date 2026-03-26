import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseSelectSceneImageCandidateArgs } from "./normalize/parse-select-scene-image-candidate-args";
import { selectSceneImageCandidateUsecase } from "./usecase/select-scene-image-candidate";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSelectSceneImageCandidateArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "selectSceneImageCandidate",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await selectSceneImageCandidateUsecase(parsed);
    logResolverAudit({
      operation: "selectSceneImageCandidate",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "selectSceneImageCandidate",
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
