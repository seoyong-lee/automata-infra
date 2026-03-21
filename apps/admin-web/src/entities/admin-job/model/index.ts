import {
  type AdminJob,
  useAdminJobsQuery,
  useAttachJobToContentMutation,
  useCreateDraftJobMutation,
  usePendingReviewsQuery,
  useRequestUploadMutation,
  useSubmitReviewDecisionMutation,
} from '@packages/graphql';

export type { AdminJob };

export type PendingReviewItem = NonNullable<
  ReturnType<typeof usePendingReviewsQuery>['data']
>['items'][number];

export const useAdminJobs = useAdminJobsQuery;
export const useCreateDraftJob = useCreateDraftJobMutation;
export const usePendingReviews = usePendingReviewsQuery;
export const useRequestJobUpload = useRequestUploadMutation;
export const useSubmitReviewDecision = useSubmitReviewDecisionMutation;
export const useAttachJobToContent = useAttachJobToContentMutation;
