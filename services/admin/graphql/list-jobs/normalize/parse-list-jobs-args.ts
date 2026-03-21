export const parseListJobsArgs = (args: Record<string, unknown>) => {
  return {
    status: typeof args.status === "string" ? args.status : undefined,
    contentId: typeof args.contentId === "string" ? args.contentId : undefined,
    nextToken: typeof args.nextToken === "string" ? args.nextToken : undefined,
    limit:
      typeof args.limit === "number" && args.limit > 0
        ? Math.min(args.limit, 200)
        : 20,
  };
};
