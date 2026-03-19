"use client";

import {
  usePendingReviewsQuery,
  useRequestUploadMutation,
  useSubmitReviewDecisionMutation,
} from "@packages/graphql";
import { useQueryClient } from "@tanstack/react-query";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const pending = usePendingReviewsQuery({ limit: 20 });
  const submitReview = useSubmitReviewDecisionMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pendingReviews"] });
      await queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    },
  });
  const requestUpload = useRequestUploadMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pendingReviews"] });
      await queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    },
  });

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Pending Reviews</h2>
      {pending.isLoading ? <p>Loading...</p> : null}
      {pending.error ? (
        <p style={{ color: "#dc2626" }}>{pending.error.message}</p>
      ) : null}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {(pending.data ?? []).map((item) => (
          <li
            key={item.jobId}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <strong>{item.jobId}</strong>
            <p>Status: {item.status}</p>
            <div className="stack">
              <button
                className="btn"
                onClick={() =>
                  submitReview.mutate({
                    jobId: item.jobId,
                    action: "approve",
                  })
                }
              >
                Approve
              </button>
              <button
                className="btn secondary"
                onClick={() =>
                  submitReview.mutate({
                    jobId: item.jobId,
                    action: "reject",
                  })
                }
              >
                Reject
              </button>
              <button
                className="btn secondary"
                onClick={() =>
                  requestUpload.mutate({
                    jobId: item.jobId,
                  })
                }
              >
                Request Upload
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
