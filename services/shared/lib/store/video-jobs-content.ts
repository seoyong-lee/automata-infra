import {
  deleteItemFromTable,
  getItem,
  getJobsTableName,
  putItem,
} from "../aws/runtime";
import {
  contentPk,
  CONTENT_CATALOG_GSI_PK,
  type ContentItem,
  type QueryPage,
} from "./video-jobs-shared";
import {
  toEncodedQueryPage,
  queryVideoJobsPage,
} from "./video-jobs-helpers";

export const getContentMeta = async (
  contentId: string,
): Promise<ContentItem | null> => {
  return getItem<ContentItem>({
    PK: contentPk(contentId),
    SK: "META",
  });
};

export const putContentMeta = async (item: ContentItem): Promise<void> => {
  await putItem(item as unknown as Record<string, unknown>);
};

export const deleteContentMeta = async (contentId: string): Promise<void> => {
  await deleteItemFromTable(getJobsTableName(), {
    PK: contentPk(contentId),
    SK: "META",
  });
};

export const listAllContentMetas = async (input: {
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<ContentItem>> => {
  const page = await queryVideoJobsPage<ContentItem>({
    indexName: "GSI6",
    keyConditionExpression: "GSI6PK = :pk",
    expressionAttributeValues: {
      ":pk": CONTENT_CATALOG_GSI_PK,
    },
    scanIndexForward: false,
    limit: input.limit ?? 50,
    nextToken: input.nextToken,
  });
  return toEncodedQueryPage(page);
};
