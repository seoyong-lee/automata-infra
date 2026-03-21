import { listAllContentMetas } from "../../../../shared/lib/store/video-jobs";
import { mapContentItemToDto } from "../../shared/mapper/map-content-item";

export const listAdminContents = async (input: {
  limit: number;
  nextToken?: string;
}) => {
  const page = await listAllContentMetas({
    limit: input.limit,
    nextToken: input.nextToken,
  });
  return {
    items: page.items.map(mapContentItemToDto),
    nextToken: page.nextToken,
  };
};
