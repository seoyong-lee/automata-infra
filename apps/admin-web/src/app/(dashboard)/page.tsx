"use client";

import { useAdminJobsQuery, usePendingReviewsQuery } from "@packages/graphql";

export default function DashboardPage() {
  const jobs = useAdminJobsQuery({ limit: 10 });
  const pending = usePendingReviewsQuery({ limit: 10 });

  return (
    <div className="stack" style={{ flexDirection: "column" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Overview</h2>
        <p>Recent jobs: {jobs.data?.length ?? 0}</p>
        <p>Pending reviews: {pending.data?.length ?? 0}</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent jobs</h3>
        {jobs.isLoading ? <p>Loading...</p> : null}
        {jobs.error ? (
          <p style={{ color: "#dc2626" }}>{jobs.error.message}</p>
        ) : null}
        <ul>
          {(jobs.data ?? []).map((job) => (
            <li key={job.jobId}>
              {job.jobId} - {job.status} - {job.videoTitle}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
