import { listJobMetasByContentId } from "../../../../shared/lib/store/video-jobs-meta";
import { mapJobMetaToChannelPublishQueueItem } from "../mapper/map-job-meta-to-channel-publish-queue-item";
import type { ListChannelPublishQueueParsed } from "../normalize/parse-channel-publish-queue-args";

export const listChannelPublishQueue = async (
  input: ListChannelPublishQueueParsed,
): Promise<{
  items: NonNullable<ReturnType<typeof mapJobMetaToChannelPublishQueueItem>>[];
  nextToken: null;
}> => {
  const page = await listJobMetasByContentId({
    contentId: input.contentId,
    limit: 100,
    nextToken: undefined,
  });

  const items = page.items
    .map(mapJobMetaToChannelPublishQueueItem)
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, input.limit);

  return { items, nextToken: null };
};
