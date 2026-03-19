export const mapJobTimelineItem = (item: Record<string, unknown>) => {
  return {
    pk: typeof item.PK === "string" ? item.PK : "",
    sk: typeof item.SK === "string" ? item.SK : "",
    data: JSON.stringify(item),
  };
};
