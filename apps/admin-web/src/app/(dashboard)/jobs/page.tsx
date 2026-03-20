"use client";

import Link from "next/link";
import { Badge } from "@packages/ui/badge";
import { useAdminJobsQuery } from "@packages/graphql";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import { Button } from "@packages/ui/button";
import { getErrorMessage } from "@packages/utils";

export default function JobsPage() {
  const jobsQuery = useAdminJobsQuery({
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Jobs</CardTitle>
            <CardDescription>
              운영 로그가 아니라, 좋은 실험 결과를 다시 쓰기 위한
              카탈로그입니다.
            </CardDescription>
          </div>
          <Button onClick={() => (window.location.href = "/jobs/new")}>
            Create Draft Job
          </Button>
        </CardHeader>
      </Card>

      {jobsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading jobs...</p>
      ) : null}
      {jobsQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(jobsQuery.error)}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(jobsQuery.data?.items ?? []).map((job, index) => (
          <Card key={job.jobId}>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{job.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {job.variant
                    ? `Variant ${job.variant}`
                    : `Variant ${["A", "B", "C"][index % 3]}`}
                </span>
              </div>
              <div>
                <CardTitle className="text-base">{job.videoTitle}</CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">
                  {job.jobId}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Channel</p>
                  <p>{job.channelId}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Content</p>
                  <p>{job.contentType ?? "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Duration</p>
                  <p>{job.targetDurationSec}s</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Retry</p>
                  <p>{job.retryCount}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Publish</p>
                  <p>{job.autoPublish ? "auto" : "review"}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Updated</p>
                  <p>{job.updatedAt}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-muted px-2 py-1">
                  Clone as new job
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  Resume failed job
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  Compare with previous
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  Promote to template
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/jobs/${job.jobId}`}
                >
                  Open experiment
                </Link>
                <span className="text-xs text-muted-foreground">
                  est. ${((job.targetDurationSec / 10) * 0.04).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
