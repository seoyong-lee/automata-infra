import type { PendingReview } from '@packages/graphql';

import type { AdminJob } from '@/entities/admin-job';

/** 표본 한도 내에서 병목·장기 체류를 잡기 위한 기준(갱신 시각 기준). */
export const DASHBOARD_STALE_MS = 24 * 60 * 60 * 1000;

export const DASHBOARD_JOBS_QUERY_LIMIT = 200;

export type DashboardActionQueue = {
  /** 검수 대기(큐 API와 상태 기준 중 큰 값). */
  reviewNeeded: number;
  /** 실패 + 파이프라인 장기 체류(막힘). */
  failedOrBlocked: number;
  /** 출고 직전 업로드 대기. */
  uploadPending: number;
};

export type DashboardBottlenecks = {
  sceneJsonLongDwell: number;
  assetGenLongDwell: number;
  failedJobs: number;
};

export type ResumeReviewRow = {
  jobId: string;
  title: string;
  reviewRequestedAt: string | null;
};

export type DashboardResume = {
  recentUpdatedJobs: AdminJob[];
  recentReviewRequests: ResumeReviewRow[];
  recentFailedJobs: AdminJob[];
};

export type DashboardSnapshot = {
  actionQueue: DashboardActionQueue;
  bottlenecks: DashboardBottlenecks;
  resume: DashboardResume;
};

function isUpdatedStale(iso: string, staleMs: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > staleMs;
}

function isPipelineStuckNonFailed(job: AdminJob, staleMs: number): boolean {
  if (job.status === 'FAILED') return false;
  if (!isUpdatedStale(job.updatedAt, staleMs)) return false;
  return (
    job.status === 'SCENE_JSON_BUILDING' ||
    job.status === 'ASSET_GENERATING' ||
    job.status === 'PLANNING' ||
    job.status === 'VALIDATING'
  );
}

/**
 * 운영 대시보드용 스냅샷(클라이언트 집계).
 * 전역 작업함이 매우 클 경우 표본 밖 작업은 포함되지 않습니다.
 */
export function buildDashboardSnapshot(
  jobs: AdminJob[],
  pendingReviews: PendingReview[],
  staleMs: number = DASHBOARD_STALE_MS,
): DashboardSnapshot {
  const sortedByUpdated = [...jobs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const jobById: Record<string, AdminJob> = {};
  for (const j of jobs) {
    jobById[j.jobId] = j;
  }

  const reviewByStatus = jobs.filter((j) => j.status === 'REVIEW_PENDING').length;
  const reviewNeeded = Math.max(pendingReviews.length, reviewByStatus);

  const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
  const pipelineStuck = jobs.filter((j) => isPipelineStuckNonFailed(j, staleMs)).length;
  const failedOrBlocked = failedJobs + pipelineStuck;

  const uploadPending = jobs.filter(
    (j) => j.status === 'READY_TO_SCHEDULE' || j.status === 'UPLOAD_QUEUED',
  ).length;

  const sceneJsonLongDwell = jobs.filter(
    (j) => j.status === 'SCENE_JSON_BUILDING' && isUpdatedStale(j.updatedAt, staleMs),
  ).length;

  const assetGenLongDwell = jobs.filter(
    (j) => j.status === 'ASSET_GENERATING' && isUpdatedStale(j.updatedAt, staleMs),
  ).length;

  const recentReviewRequests: ResumeReviewRow[] = [...pendingReviews]
    .sort((a, b) => {
      const ta = a.reviewRequestedAt ? new Date(a.reviewRequestedAt).getTime() : 0;
      const tb = b.reviewRequestedAt ? new Date(b.reviewRequestedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5)
    .map((pr) => ({
      jobId: pr.jobId,
      title: jobById[pr.jobId]?.videoTitle?.trim() || pr.jobId,
      reviewRequestedAt: pr.reviewRequestedAt ?? null,
    }));

  const recentFailedJobs = sortedByUpdated.filter((j) => j.status === 'FAILED').slice(0, 5);

  return {
    actionQueue: {
      reviewNeeded,
      failedOrBlocked,
      uploadPending,
    },
    bottlenecks: {
      sceneJsonLongDwell,
      assetGenLongDwell,
      failedJobs,
    },
    resume: {
      recentUpdatedJobs: sortedByUpdated.slice(0, 5),
      recentReviewRequests,
      recentFailedJobs,
    },
  };
}
