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

  if (message.includes("required") || message.includes("invalid")) {
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

  return new GraphqlResolverError({
    code: "INTERNAL_SERVER_ERROR",
    message: "internal server error",
  });
};

export const badUserInput = (message: string): GraphqlResolverError => {
  return new GraphqlResolverError({
    code: "BAD_USER_INPUT",
    message,
  });
};
