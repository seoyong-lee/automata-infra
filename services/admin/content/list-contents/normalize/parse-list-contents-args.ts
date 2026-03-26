export const parseListContentsArgs = (args: Record<string, unknown>) => {
  return {
    nextToken: typeof args.nextToken === "string" ? args.nextToken : undefined,
    limit:
      typeof args.limit === "number" && args.limit > 0
        ? Math.min(args.limit, 100)
        : 50,
  };
};
