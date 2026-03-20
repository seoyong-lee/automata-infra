"use client";

import { Badge } from "@packages/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/table";
import { useAdminJobsQuery, usePendingReviewsQuery } from "@packages/graphql";
import { getErrorMessage } from "@packages/utils";
import {
  Activity,
  CircleDollarSign,
  Clock3,
  ClipboardCheck,
} from "lucide-react";
import type { ComponentType } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardDescription>{title}</CardDescription>
          <div className="flex items-center gap-2">
            {badge ? (
              <Badge variant="outline" className="rounded-full">
                {badge}
              </Badge>
            ) : null}
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const jobs = useAdminJobsQuery({ limit: 20 });
  const pending = usePendingReviewsQuery({ limit: 10 });
  const recentJobs = (jobs.data?.items ?? []).slice(0, 8);
  const pendingReviews = pending.data?.items ?? [];

  const inProgressCount = (jobs.data?.items ?? []).filter((job) =>
    [
      "PLANNED",
      "SCENE_JSON_READY",
      "ASSET_GENERATING",
      "ASSETS_READY",
    ].includes(job.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Jobs"
          value={(jobs.data?.items.length ?? 0).toLocaleString()}
          description="현재 조회 범위 내 전체 작업 수"
          icon={Activity}
        />
        <MetricCard
          title="Pending Reviews"
          value={pendingReviews.length.toLocaleString()}
          description="승인 또는 반려 대기 건"
          icon={ClipboardCheck}
          // badge="Action required"
        />
        <MetricCard
          title="In Progress"
          value={inProgressCount.toLocaleString()}
          description="생성 파이프라인 진행 중"
          icon={Clock3}
        />
        <MetricCard
          title="Ready To Upload"
          value={(jobs.data?.items ?? [])
            .filter((job) => job.status === "APPROVED")
            .length.toLocaleString()}
          description="업로드 요청 가능 상태"
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>
              최신 작업 상태를 빠르게 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading jobs...</p>
            ) : null}
            {jobs.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(jobs.error)}
              </p>
            ) : null}
            {!jobs.isLoading && !jobs.error ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No jobs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentJobs.map((job) => (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-mono text-xs">
                          {job.jobId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.videoTitle}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews Queue</CardTitle>
            <CardDescription>리뷰 큐 적체 여부를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading reviews...
              </p>
            ) : null}
            {pending.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(pending.error)}
              </p>
            ) : null}
            {!pending.isLoading && !pending.error ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No pending reviews.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingReviews.slice(0, 8).map((review) => (
                      <TableRow key={review.jobId}>
                        <TableCell className="font-mono text-xs">
                          {review.jobId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{review.reviewRequestedAt ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
