import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ddbClient,
} from "./runtime-clients";
import { getJobsTableName } from "./runtime-env";

export const putItem = async (item: Record<string, unknown>): Promise<void> => {
  await putItemToTable(getJobsTableName(), item);
};

export const putItemToTable = async (
  tableName: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await ddbClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
};

export const deleteItemFromTable = async (
  tableName: string,
  key: Record<string, unknown>,
): Promise<void> => {
  await ddbClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    }),
  );
};

export const getItem = async <T>(
  key: Record<string, unknown>,
): Promise<T | null> => {
  return getItemFromTable<T>(getJobsTableName(), key);
};

export const getItemFromTable = async <T>(
  tableName: string,
  key: Record<string, unknown>,
): Promise<T | null> => {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    }),
  );

  return (result.Item as T | undefined) ?? null;
};

const compositePkSk = (pk: unknown, sk: unknown): string =>
  `${String(pk)}|${String(sk)}`;

const delayMs = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

type BatchGetPending = { key: Record<string, unknown>; index: number };

const unprocessedMatchesPending = (
  unprocessed: Record<string, unknown>[],
  p: BatchGetPending,
): boolean =>
  unprocessed.some(
    (u) =>
      String(u.PK) === String(p.key.PK) && String(u.SK) === String(p.key.SK),
  );

const batchGetSliceUntilDone = async <T>(
  tableName: string,
  initialPending: BatchGetPending[],
  result: (T | null)[],
): Promise<void> => {
  let pending = initialPending;
  while (pending.length > 0) {
    const resp = await ddbClient.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: pending.map((p) => p.key),
          },
        },
      }),
    );
    const items = resp.Responses?.[tableName] ?? [];
    const map = new Map<string, T>();
    for (const item of items) {
      const rec = item as Record<string, unknown>;
      map.set(compositePkSk(rec.PK, rec.SK), item as T);
    }
    for (const p of pending) {
      const hit = map.get(compositePkSk(p.key.PK, p.key.SK));
      if (hit) {
        result[p.index] = hit;
      }
    }
    const unprocessedRaw = resp.UnprocessedKeys?.[tableName]?.Keys ?? [];
    const unprocessed = unprocessedRaw as Record<string, unknown>[];
    if (unprocessed.length === 0) {
      return;
    }
    pending = pending.filter((p) => unprocessedMatchesPending(unprocessed, p));
    await delayMs(25);
  }
};

export const batchGetItems = async <T>(
  keys: Record<string, unknown>[],
): Promise<(T | null)[]> => {
  const tableName = getJobsTableName();
  const n = keys.length;
  if (n === 0) {
    return [];
  }
  const result: (T | null)[] = new Array(n).fill(null);
  for (let start = 0; start < n; start += 100) {
    const slice = keys.slice(start, start + 100);
    const indices = slice.map((_, i) => start + i);
    const pending: BatchGetPending[] = slice.map((k, i) => ({
      key: k,
      index: indices[i]!,
    }));
    await batchGetSliceUntilDone<T>(tableName, pending, result);
  }
  return result;
};

export const queryItems = async <T>(input: {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
}): Promise<T[]> => {
  return queryItemsFromTable<T>(getJobsTableName(), input);
};

export const queryItemsFromTable = async <T>(
  tableName: string,
  input: {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
    scanIndexForward?: boolean;
    limit?: number;
  },
): Promise<T[]> => {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: input.indexName,
      KeyConditionExpression: input.keyConditionExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ScanIndexForward: input.scanIndexForward,
      Limit: input.limit,
    }),
  );

  return (result.Items as T[] | undefined) ?? [];
};

export const queryItemsPage = async <T>(input: {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}): Promise<{
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
}> => {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: getJobsTableName(),
      IndexName: input.indexName,
      KeyConditionExpression: input.keyConditionExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ScanIndexForward: input.scanIndexForward,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
    }),
  );

  return {
    items: (result.Items as T[] | undefined) ?? [],
    lastEvaluatedKey: result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined,
  };
};

export const updateItem = async (input: {
  key: Record<string, unknown>;
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  conditionExpression?: string;
}): Promise<void> => {
  await updateItemInTable(getJobsTableName(), input);
};

export const updateItemInTable = async (
  tableName: string,
  input: {
    key: Record<string, unknown>;
    updateExpression: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
    conditionExpression?: string;
  },
): Promise<void> => {
  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: input.key,
      UpdateExpression: input.updateExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ConditionExpression: input.conditionExpression,
    }),
  );
};
