"use client";

import Link from "next/link";
import { useAdminJobsQuery } from "@packages/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
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
          <CardTitle>Jobs</CardTitle>
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

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Job ID</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(jobsQuery.data?.items ?? []).map((job) => (
                <tr key={job.jobId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="text-primary hover:underline"
                      href={`/jobs/${job.jobId}`}
                    >
                      {job.jobId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{job.status}</td>
                  <td className="px-4 py-3">{job.videoTitle}</td>
                  <td className="px-4 py-3">{job.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
