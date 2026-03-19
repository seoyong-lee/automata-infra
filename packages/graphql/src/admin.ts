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
  status: string;
  reviewAction?: string | null;
  channelId: string;
  videoTitle: string;
  updatedAt: string;
};

export type PendingReview = {
  jobId: string;
  status: string;
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
};

const adminJobsQuery = `
  query AdminJobs($status: String, $channelId: String, $limit: Int) {
    adminJobs(status: $status, channelId: $channelId, limit: $limit) {
      jobId
      status
      reviewAction
      channelId
      videoTitle
      updatedAt
    }
  }
`;

const pendingReviewsQuery = `
  query PendingReviews($limit: Int) {
    pendingReviews(limit: $limit) {
      jobId
      status
      previewS3Key
      reviewRequestedAt
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
  vars: { status?: string; channelId?: string; limit?: number },
  options?: Omit<
    UseQueryOptions<AdminJob[], Error, AdminJob[], readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: [
      "adminJobs",
      vars.status ?? "",
      vars.channelId ?? "",
      vars.limit ?? 20,
    ],
    queryFn: async () => {
      const data = await gql<{ adminJobs: AdminJob[] }>(adminJobsQuery, vars);
      return data.adminJobs;
    },
    ...options,
  });
};

export const usePendingReviewsQuery = (
  vars: { limit?: number },
  options?: Omit<
    UseQueryOptions<
      PendingReview[],
      Error,
      PendingReview[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["pendingReviews", vars.limit ?? 20],
    queryFn: async () => {
      const data = await gql<{ pendingReviews: PendingReview[] }>(
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
    { jobId: string; action: string; regenerationScope?: string }
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
