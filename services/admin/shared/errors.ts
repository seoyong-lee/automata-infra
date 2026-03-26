export type GraphqlErrorCode =
  | "BAD_USER_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR";

type GraphqlResolverErrorInput = {
  code: GraphqlErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export class GraphqlResolverError extends Error {
  readonly code: GraphqlErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(input: GraphqlResolverErrorInput) {
    super(input.message);
    this.name = input.code;
    this.code = input.code;
    this.details = input.details;
  }
}

const hasMessage = (error: unknown): error is { message: string } => {
  return (
    !!error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
};

/** Admin 전용: 클라이언트에 원인을 알리되, 한 줄·길이 제한으로 로그/응답을 막는다. */
const sanitizeResolverMessage = (message: string): string => {
  const oneLine = message.replace(/\s+/g, " ").trim();
  const max = 900;
  if (oneLine.length <= max) {
    return oneLine;
  }
  return `${oneLine.slice(0, max)}…`;
};

export const toGraphqlResolverError = (
  error: unknown,
): GraphqlResolverError => {
  if (error instanceof GraphqlResolverError) {
    return error;
  }

  const message = hasMessage(error) ? error.message : "unexpected error";

  if (message.includes("forbidden")) {
    return new GraphqlResolverError({
      code: "FORBIDDEN",
      message: "forbidden",
    });
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("required") ||
    lower.includes("invalid") ||
    lower.includes("must be") ||
    lower.includes("non-empty")
  ) {
    return new GraphqlResolverError({
      code: "BAD_USER_INPUT",
      message,
    });
  }

  if (message.includes("not found")) {
    return new GraphqlResolverError({
      code: "NOT_FOUND",
      message,
    });
  }

  const detail = sanitizeResolverMessage(message);
  return new GraphqlResolverError({
    code: "INTERNAL_SERVER_ERROR",
    message: detail.length > 0 ? detail : "internal server error",
  });
};

export const badUserInput = (message: string): GraphqlResolverError => {
  return new GraphqlResolverError({
    code: "BAD_USER_INPUT",
    message,
  });
};

export const notFound = (message: string): GraphqlResolverError => {
  return new GraphqlResolverError({
    code: "NOT_FOUND",
    message,
  });
};

export const conflict = (message: string): GraphqlResolverError => {
  return new GraphqlResolverError({
    code: "CONFLICT",
    message,
  });
};
