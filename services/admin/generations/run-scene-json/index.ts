import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { GraphqlResolverEvent } from "../../shared/types";
import { handleRunSceneJsonCatch } from "./handle-run-scene-json-error";
import { parseRunSceneJsonArgs } from "./normalize/parse-run-scene-json-args";
import { runAdminSceneJson } from "./usecase/run-scene-json";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseRunSceneJsonArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "runSceneJson",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await runAdminSceneJson(parsed.jobId, actor);
    logResolverAudit({
      operation: "runSceneJson",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    handleRunSceneJsonCatch(error, actor, jobId);
  }
};
