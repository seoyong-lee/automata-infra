export const parseListContentPresetsArgs = (args: Record<string, unknown>) => {
  return {
    includeInactive:
      typeof args.includeInactive === "boolean" ? args.includeInactive : false,
  };
};
