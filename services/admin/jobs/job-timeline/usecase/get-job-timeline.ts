import { mapJobTimelineItem } from "../mapper/map-job-timeline-item";
import { listJobTimeline } from "../repo/list-job-timeline";

export const getJobTimeline = async (jobId: string) => {
  const items = await listJobTimeline(jobId);
  return items.map(mapJobTimelineItem);
};
