import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";

const rawErrorMessage = (error: unknown): string => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
};

/** catch 블록 전부: 로깅·감사·GraphQL 에러로 변환 후 throw */
export const handleRunSceneJsonCatch = (
  error: unknown,
  actor: string,
  jobId: string | undefined,
  operation: string = "runSceneJson",
): never => {
  const message = rawErrorMessage(error);
  console.error(
    JSON.stringify({
      event: `${operation}_handler_error`,
      jobId,
      message,
      stack:
        error instanceof Error && error.stack
          ? error.stack.slice(0, 2000)
          : undefined,
    }),
  );
  const mapped = toGraphqlResolverError(error);
  logResolverAudit({
    operation,
    operationType: "mutation",
    phase: "failed",
    actor,
    jobId,
    errorCode: mapped.code,
    errorMessage: mapped.message,
    errorCause: message,
  });
  throw mapped;
};
