export const parsePendingReviewsArgs = (args: Record<string, unknown>) => {
  return {
    limit:
      typeof args.limit === "number" && args.limit > 0
        ? Math.min(args.limit, 100)
        : 20,
  };
};
