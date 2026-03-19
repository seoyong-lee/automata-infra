export const parseListJobsArgs = (args: Record<string, unknown>) => {
  return {
    status: typeof args.status === "string" ? args.status : undefined,
    channelId: typeof args.channelId === "string" ? args.channelId : undefined,
    limit:
      typeof args.limit === "number" && args.limit > 0
        ? Math.min(args.limit, 100)
        : 20,
  };
};
