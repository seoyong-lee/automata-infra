import type {
  ResolverAuditFieldInput,
  ResolverAuditFields,
} from "./run-audited-admin-resolver";

type ResolverAuditFieldsResolver<TParsed = unknown, TResult = unknown> = (
  input: ResolverAuditFieldInput<TParsed, TResult>,
) => ResolverAuditFields;

const readAuditPath = (value: unknown, path: string): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === "string") {
    return current;
  }
  if (typeof current === "number") {
    return String(current);
  }
  return undefined;
};

export const combineResolverAuditFields = <TParsed, TResult>(
  ...resolvers: Array<ResolverAuditFieldsResolver<TParsed, TResult>>
): ResolverAuditFieldsResolver<TParsed, TResult> => {
  return (input) =>
    resolvers.reduce<ResolverAuditFields>(
      (merged, resolver) => ({
        ...merged,
        ...resolver(input),
      }),
      {},
    );
};

export const resolveJobIdAuditFields = <TParsed, TResult>(input?: {
  parsedPath?: string;
  resultPath?: string;
}): ResolverAuditFieldsResolver<TParsed, TResult> => {
  return ({ parsed, result }) => ({
    jobId:
      readAuditPath(result, input?.resultPath ?? "jobId") ??
      readAuditPath(parsed, input?.parsedPath ?? "jobId"),
  });
};

export const resolveActionAuditFields = <TParsed, TResult>(input: {
  parsedPath?: string;
  resultPath?: string;
}): ResolverAuditFieldsResolver<TParsed, TResult> => {
  return ({ parsed, result }) => ({
    action:
      (input.resultPath
        ? readAuditPath(result, input.resultPath)
        : undefined) ??
      (input.parsedPath ? readAuditPath(parsed, input.parsedPath) : undefined),
  });
};

export const resolveContentIdAuditFields = <TParsed, TResult>(input?: {
  parsedPath?: string;
  resultPath?: string;
}): ResolverAuditFieldsResolver<TParsed, TResult> => {
  return ({ parsed, result }) => ({
    contentId:
      readAuditPath(result, input?.resultPath ?? "contentId") ??
      readAuditPath(parsed, input?.parsedPath ?? "contentId"),
  });
};
