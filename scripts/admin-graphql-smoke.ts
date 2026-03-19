/* eslint-disable no-console */
type EnvConfig = {
  endpoint: string;
  idToken: string;
};

const getConfig = (): EnvConfig => {
  const endpoint = process.env.ADMIN_GRAPHQL_ENDPOINT;
  const idToken = process.env.ADMIN_ID_TOKEN;
  if (!endpoint || !idToken) {
    throw new Error(
      "Missing env. Set ADMIN_GRAPHQL_ENDPOINT and ADMIN_ID_TOKEN to run smoke checks.",
    );
  }
  return {
    endpoint,
    idToken,
  };
};

const graphqlRequest = async (
  endpoint: string,
  idToken: string,
  query: string,
  variables?: Record<string, unknown>,
) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: idToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message?: string }>;
  };
  return payload;
};

const run = async () => {
  const { endpoint, idToken } = getConfig();
  const listQuery = `
    query AdminJobsSmoke($limit: Int) {
      adminJobs(limit: $limit) {
        items {
          jobId
          status
          reviewAction
        }
        nextToken
      }
    }
  `;
  const pendingQuery = `
    query PendingReviewsSmoke($limit: Int) {
      pendingReviews(limit: $limit) {
        items {
          jobId
          status
        }
        nextToken
      }
    }
  `;

  const listResult = await graphqlRequest(endpoint, idToken, listQuery, {
    limit: 5,
  });
  const pendingResult = await graphqlRequest(endpoint, idToken, pendingQuery, {
    limit: 5,
  });

  console.log(
    JSON.stringify(
      {
        adminJobsErrors: listResult.errors ?? [],
        pendingReviewsErrors: pendingResult.errors ?? [],
      },
      null,
      2,
    ),
  );
};

void run();
