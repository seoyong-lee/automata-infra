import {
  listJobMetasByChannel,
  listJobMetasByStatus,
} from "../../../../shared/lib/store/video-jobs";

export const listJobs = async (input: {
  status?: string;
  channelId?: string;
  nextToken?: string;
  limit: number;
}) => {
  if (input.status) {
    return listJobMetasByStatus({
      status: input.status,
      limit: input.limit,
      nextToken: input.nextToken,
    });
  }
  if (input.channelId) {
    return listJobMetasByChannel({
      channelId: input.channelId,
      limit: input.limit,
      nextToken: input.nextToken,
    });
  }
  return listJobMetasByStatus({
    status: "REVIEW_PENDING",
    limit: input.limit,
    nextToken: input.nextToken,
  });
};
