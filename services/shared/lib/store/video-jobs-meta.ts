import {
  getItem,
  putItem,
  updateItem,
} from "../aws/runtime";
import {
  ALL_JOB_STATUSES_FOR_ADMIN,
  gsi2PkForContentId,
  jobPk,
  type JobMetaItem,
  normalizeJobMeta,
  type QueryPage,
} from "./video-jobs-shared";
import {
  mapEncodedQueryPage,
  queryVideoJobsPage,
} from "./video-jobs-helpers";

export const putJobMeta = async (item: JobMetaItem): Promise<void> => {
  await putItem(item);
};

export const getJobMeta = async (
  jobId: string,
): Promise<JobMetaItem | null> => {
  const raw = await getItem<JobMetaItem & { channelId?: string }>({
    PK: jobPk(jobId),
    SK: "META",
  });
  if (!raw) {
    return null;
  }
  return normalizeJobMeta(raw);
};

export const updateJobMeta = async (
  jobId: string,
  fields: Record<string, unknown>,
  status?: string,
): Promise<void> => {
  const updatedAt = new Date().toISOString();
  const names: Record<string, string> = {
    "#updatedAt": "updatedAt",
  };
  const values: Record<string, unknown> = {
    ":updatedAt": updatedAt,
  };
  const assignments = ["#updatedAt = :updatedAt"];

  if (status) {
    names["#status"] = "status";
    names["#gsi1pk"] = "GSI1PK";
    names["#gsi1sk"] = "GSI1SK";
    values[":status"] = status;
    values[":gsi1pk"] = `STATUS#${status}`;
    values[":gsi1sk"] = updatedAt;
    assignments.push(
      "#status = :status",
      "#gsi1pk = :gsi1pk",
      "#gsi1sk = :gsi1sk",
    );
  }

  if (
    typeof fields.contentId === "string" &&
    fields.contentId.trim().length > 0
  ) {
    names["#gsi2pk"] = "GSI2PK";
    names["#gsi2sk"] = "GSI2SK";
    values[":gsi2pk"] = gsi2PkForContentId(fields.contentId);
    values[":gsi2sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi2pk = :gsi2pk", "#gsi2sk = :gsi2sk");
    names["#gsi5pk"] = "GSI5PK";
    names["#gsi5sk"] = "GSI5SK";
    values[":gsi5pk"] = `CONTENT#${fields.contentId}`;
    values[":gsi5sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi5pk = :gsi5pk", "#gsi5sk = :gsi5sk");
  }

  if (
    typeof fields.contentType === "string" &&
    fields.contentType.trim().length > 0
  ) {
    names["#gsi4pk"] = "GSI4PK";
    names["#gsi4sk"] = "GSI4SK";
    values[":gsi4pk"] = `CONTENT#${fields.contentType}`;
    values[":gsi4sk"] = `${updatedAt}#JOB#${jobId}`;
    assignments.push("#gsi4pk = :gsi4pk", "#gsi4sk = :gsi4sk");
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    assignments.push(`#${key} = :${key}`);
  }

  await updateItem({
    key: {
      PK: jobPk(jobId),
      SK: "META",
    },
    updateExpression: `SET ${assignments.join(", ")}`,
    expressionAttributeNames: names,
    expressionAttributeValues: values,
  });
};

export const listJobMetasByStatus = async (input: {
  status: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryVideoJobsPage<JobMetaItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :statusPk",
    expressionAttributeValues: {
      ":statusPk": `STATUS#${input.status}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    nextToken: input.nextToken,
  });
  return mapEncodedQueryPage({
    page,
    mapItem: normalizeJobMeta,
  });
};

export const listJobMetasMergedByRecent = async (input: {
  limit: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  if (input.nextToken) {
    return { items: [], nextToken: null };
  }
  const perStatusLimit = input.limit;
  const pages = await Promise.all(
    ALL_JOB_STATUSES_FOR_ADMIN.map((status) =>
      listJobMetasByStatus({
        status,
        limit: perStatusLimit,
        nextToken: undefined,
      }),
    ),
  );
  const byId = new Map<string, JobMetaItem>();
  for (const page of pages) {
    for (const item of page.items) {
      byId.set(item.jobId, item);
    }
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return {
    items: merged.slice(0, input.limit),
    nextToken: null,
  };
};

export const listJobMetasByGsi2Partition = async (input: {
  partitionId: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryVideoJobsPage<JobMetaItem>({
    indexName: "GSI2",
    keyConditionExpression: "GSI2PK = :channelPk",
    expressionAttributeValues: {
      ":channelPk": gsi2PkForContentId(input.partitionId),
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    nextToken: input.nextToken,
  });
  return mapEncodedQueryPage({
    page,
    mapItem: normalizeJobMeta,
  });
};

export const listJobMetasByContentType = async (input: {
  contentType: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryVideoJobsPage<JobMetaItem>({
    indexName: "GSI4",
    keyConditionExpression: "GSI4PK = :contentPk",
    expressionAttributeValues: {
      ":contentPk": `CONTENT#${input.contentType}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
    nextToken: input.nextToken,
  });
  return mapEncodedQueryPage({
    page,
    mapItem: normalizeJobMeta,
  });
};

export const listJobMetasByContentId = async (input: {
  contentId: string;
  limit?: number;
  nextToken?: string;
}): Promise<QueryPage<JobMetaItem>> => {
  const page = await queryVideoJobsPage<JobMetaItem>({
    indexName: "GSI5",
    keyConditionExpression: "GSI5PK = :pk",
    expressionAttributeValues: {
      ":pk": `CONTENT#${input.contentId}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 50,
    nextToken: input.nextToken,
  });
  return mapEncodedQueryPage({
    page,
    mapItem: normalizeJobMeta,
  });
};
