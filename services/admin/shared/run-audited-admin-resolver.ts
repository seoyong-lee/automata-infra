import type { Handler } from "aws-lambda";
import { assertAdminGroup, getActor } from "../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "./audit-log";
import { toGraphqlResolverError } from "./errors";
import type { GraphqlResolverEvent } from "./types";

export type ResolverAuditFields = {
  jobId?: string;
  action?: string;
};

export type ResolverAuditFieldInput<TParsed, TResult> = {
  parsed?: TParsed;
  result?: TResult;
};

export const runAuditedAdminResolver = <TParsed, TResult>(input: {
  operation: string;
  operationType: "query" | "mutation";
  parse: (args: Record<string, unknown>) => TParsed;
  resolveAuditFields?: (
    input: ResolverAuditFieldInput<TParsed, TResult>,
  ) => ResolverAuditFields;
  onError?: (input: {
    error: unknown;
    actor: string;
    parsed?: TParsed;
  }) => never;
  run: (input: {
    parsed: TParsed;
    actor: string;
    event: GraphqlResolverEvent<Record<string, unknown>>;
  }) => Promise<TResult> | TResult;
}): Handler<GraphqlResolverEvent<Record<string, unknown>>, unknown> => {
  return async (event) => {
    const actor = getActor(event.identity);
    let parsed: TParsed | undefined;

    try {
      assertAdminGroup(event.identity);
      parsed = input.parse((event.arguments ?? {}) as Record<string, unknown>);

      logResolverAudit({
        operation: input.operation,
        operationType: input.operationType,
        phase: "started",
        actor,
        ...(input.resolveAuditFields?.({ parsed }) ?? {}),
      });

      const result = await input.run({
        parsed,
        actor,
        event,
      });

      logResolverAudit({
        operation: input.operation,
        operationType: input.operationType,
        phase: "succeeded",
        actor,
        ...(input.resolveAuditFields?.({ parsed, result }) ?? {}),
      });

      return result;
    } catch (error) {
      if (input.onError) {
        return input.onError({
          error,
          actor,
          parsed,
        });
      }

      const mapped = toGraphqlResolverError(error);

      logResolverAudit({
        operation: input.operation,
        operationType: input.operationType,
        phase: "failed",
        actor,
        ...(input.resolveAuditFields?.({ parsed }) ?? {}),
        errorCode: mapped.code,
        errorMessage: mapped.message,
      });

      throw mapped;
    }
  };
};
