"use client";

import {
  usePendingReviewsQuery,
  useRequestUploadMutation,
  useSubmitReviewDecisionMutation,
} from "@packages/graphql";
import { Badge } from "@packages/ui/badge";
import { Button } from "@packages/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { getErrorMessage } from "@packages/utils";
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
    <Card>
      <CardHeader>
        <CardTitle>Pending Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : null}
        {pending.error ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(pending.error)}
          </p>
        ) : null}
        {(pending.data?.items ?? []).map((item) => (
          <div
            key={item.jobId}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <strong className="font-mono text-xs">{item.jobId}</strong>
              <Badge variant="outline">{item.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  submitReview.mutate({
                    jobId: item.jobId,
                    action: "APPROVE",
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  submitReview.mutate({
                    jobId: item.jobId,
                    action: "REJECT",
                  })
                }
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  requestUpload.mutate({
                    jobId: item.jobId,
                  })
                }
              >
                Request Upload
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
