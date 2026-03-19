import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { getGraphqlRuntime } from "./runtime";
import { gqlFetch } from "./client/fetcher";
import { UnauthorizedError } from "./client/errors";

export type AdminJob = {
  jobId: string;
  status:
    | "PLANNED"
    | "SCENE_JSON_READY"
    | "ASSET_GENERATING"
    | "ASSETS_READY"
    | "VALIDATING"
    | "RENDER_PLAN_READY"
    | "RENDERED"
    | "REVIEW_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "UPLOAD_QUEUED"
    | "UPLOADED"
    | "FAILED"
    | "METRICS_COLLECTED";
  reviewAction?: "PENDING" | "APPROVE" | "REJECT" | "REGENERATE" | null;
  channelId: string;
  videoTitle: string;
  updatedAt: string;
};

export type PendingReview = {
  jobId: string;
  status: AdminJob["status"];
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
};

export type Connection<T> = {
  items: T[];
  nextToken?: string | null;
};

const adminJobsQuery = `
  query AdminJobs($status: JobStatus, $channelId: String, $limit: Int, $nextToken: String) {
    adminJobs(status: $status, channelId: $channelId, limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        status
        reviewAction
        channelId
        videoTitle
        updatedAt
      }
      nextToken
    }
  }
`;

const pendingReviewsQuery = `
  query PendingReviews($limit: Int, $nextToken: String) {
    pendingReviews(limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        status
        previewS3Key
        reviewRequestedAt
      }
      nextToken
    }
  }
`;

const submitReviewMutation = `
  mutation SubmitReviewDecision($input: SubmitReviewDecisionInput!) {
    submitReviewDecision(input: $input) {
      ok
      jobId
      action
      regenerationScope
      status
    }
  }
`;

const requestUploadMutation = `
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      ok
      jobId
      status
      platform
    }
  }
`;

const gql = async <T>(query: string, variables?: Record<string, unknown>) => {
  const runtime = getGraphqlRuntime();
  const token = runtime.getToken ? await runtime.getToken() : null;
  try {
    return await gqlFetch<T>({
      url: runtime.url,
      query,
      variables,
      token,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      runtime.onUnauthorized?.();
    }
    throw error;
  }
};

export const useAdminJobsQuery = (
  vars: {
    status?: AdminJob["status"];
    channelId?: string;
    limit?: number;
    nextToken?: string;
  },
  options?: Omit<
    UseQueryOptions<
      Connection<AdminJob>,
      Error,
      Connection<AdminJob>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: [
      "adminJobs",
      vars.status ?? "",
      vars.channelId ?? "",
      vars.limit ?? 20,
      vars.nextToken ?? "",
    ],
    queryFn: async () => {
      const data = await gql<{ adminJobs: Connection<AdminJob> }>(
        adminJobsQuery,
        vars,
      );
      return data.adminJobs;
    },
    ...options,
  });
};

export const usePendingReviewsQuery = (
  vars: { limit?: number; nextToken?: string },
  options?: Omit<
    UseQueryOptions<
      Connection<PendingReview>,
      Error,
      Connection<PendingReview>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["pendingReviews", vars.limit ?? 20, vars.nextToken ?? ""],
    queryFn: async () => {
      const data = await gql<{ pendingReviews: Connection<PendingReview> }>(
        pendingReviewsQuery,
        vars,
      );
      return data.pendingReviews;
    },
    ...options,
  });
};

export const useSubmitReviewDecisionMutation = (
  options?: UseMutationOptions<
    { submitReviewDecision: { ok: boolean; status: string } },
    Error,
    {
      jobId: string;
      action: "APPROVE" | "REJECT" | "REGENERATE";
      regenerationScope?: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ submitReviewDecision: { ok: boolean; status: string } }>(
        submitReviewMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useRequestUploadMutation = (
  options?: UseMutationOptions<
    { requestUpload: { ok: boolean; status: string } },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ requestUpload: { ok: boolean; status: string } }>(
        requestUploadMutation,
        { input },
      );
    },
    ...options,
  });
};
