'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs, usePendingReviews } from '@/entities/admin-job';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const formatStatusLabel = (status: string) => {
  return status.toLowerCase().replace(/_/g, ' ');
};

export function DashboardPage() {
  const jobsQuery = useAdminJobs({ limit: 100 });
  const contentsQuery = useAdminContents({ limit: 100 });
  const pendingReviewsQuery = usePendingReviews({ limit: 50 });

  const jobs = jobsQuery.data?.items ?? [];
  const pendingReviews = pendingReviewsQuery.data?.items ?? [];
  const catalog = contentsQuery.data?.items ?? [];

  const metrics = useMemo(() => {
    const counts = jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalJobs: jobs.length,
      renderedJobs: (counts.RENDERED ?? 0) + (counts.UPLOADED ?? 0),
      pendingReviews: pendingReviews.length,
      failedJobs: counts.FAILED ?? 0,
      assetBacklog:
        (counts.PLANNED ?? 0) + (counts.SCENE_JSON_READY ?? 0) + (counts.ASSET_GENERATING ?? 0),
    };
  }, [jobs, pendingReviews.length]);

  const metricCards = useMemo(() => {
    return [
      { title: '제작 아이템 (표본)', value: metrics.totalJobs, href: '/jobs' },
      {
        title: '렌더·업로드 완료',
        value: metrics.renderedJobs,
        href: '/jobs',
      },
      {
        title: '검수 대기',
        value: metrics.pendingReviews,
        href: '/reviews',
      },
      {
        title: '에셋 백로그 (근사)',
        value: metrics.assetBacklog,
        href: '/executions',
      },
      {
        title: '실패 제작 아이템',
        value: metrics.failedJobs,
        href: '/executions',
      },
    ];
  }, [metrics]);

  const channelRows = useMemo(() => {
    const contentIds = Array.from(
      new Set(
        [...catalog.map((c) => c.contentId), ...jobs.map((item) => item.contentId)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ).sort();

    return contentIds.map((contentId) => {
      const channelJobs = jobs.filter((job) => job.contentId === contentId);
      const uploadedCount = channelJobs.filter((job) => job.status === 'UPLOADED').length;
      const blockedCount = channelJobs.filter(
        (job) => job.status === 'FAILED' || job.status === 'REVIEW_PENDING',
      ).length;
      return {
        contentId,
        contentHref: `/content/${encodeURIComponent(contentId)}/jobs`,
        totalJobs: channelJobs.length,
        uploadedCount,
        blockedCount,
        contentLabel: catalog.find((c) => c.contentId === contentId)?.label ?? '—',
      };
    });
  }, [jobs, catalog]);

  const bottlenecks = useMemo(() => {
    return [
      {
        label: 'Review bottleneck',
        value: pendingReviews.length,
        hint: 'Jobs waiting for manual approval before publish',
        href: '/reviews',
      },
      {
        label: 'Asset generation backlog',
        value: jobs.filter(
          (job) => job.status === 'SCENE_JSON_READY' || job.status === 'ASSET_GENERATING',
        ).length,
        hint: 'Jobs still building image, video, or voice assets',
        href: '/reviews',
      },
      {
        label: 'Upload blocked',
        value: jobs.filter(
          (job) =>
            job.status === 'APPROVED' || job.status === 'RENDERED' || job.status === 'FAILED',
        ).length,
        hint: 'Rendered jobs not yet published or jobs with runtime errors',
        href: '/reviews',
      },
    ];
  }, [jobs, pendingReviews.length]);

  const recentJobs = useMemo(() => jobs.slice(0, 8), [jobs]);
  const experimentLanes = useMemo(
    () => [
      {
        title: 'Scene JSON Standard',
        note: 'topic -> structured script -> scene package',
        items: ['headline-top', 'fact-card', 'caption-heavy'],
      },
      {
        title: 'Renderer Abstraction',
        note: 'Shotstack MVP now, FFmpeg/Fargate later',
        items: ['ShotstackRenderer', 'FfmpegRenderer', 'shared render(service)'],
      },
      {
        title: 'Asset Generation',
        note: 'image / video / audio generated before composition',
        items: ['video-first', 'image fallback', 'tts retry'],
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="대시보드"
        subtitle="모든 채널을 한곳에서 묶어 병목·에러·리뷰 대기·업로드 진행 상태를 파악하는 운영 현황입니다."
      />

      {jobsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
      ) : null}
      {pendingReviewsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pendingReviewsQuery.error)}</p>
      ) : null}
      {contentsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(contentsQuery.error)}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-sm">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">{card.value}</p>
              <Link className="text-sm text-primary hover:underline" href={card.href}>
                이동
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>채널별 요약</CardTitle>
            <CardDescription>
              채널(콘텐츠 ID) 단위로 제작 아이템 수·업로드 완료·막힌 작업을 봅니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 집계할 채널이 없습니다. 먼저 채널을 추가하거나 제작 아이템을 생성하세요.
              </p>
            ) : null}
            {channelRows.map((row) => (
              <div
                key={row.contentId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium font-mono text-sm">{row.contentLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    uploaded {row.uploadedCount} / blocked {row.blockedCount}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{row.totalJobs} jobs</Badge>
                  <Link className="text-sm text-primary hover:underline" href={row.contentHref}>
                    채널로
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 제작 아이템</CardTitle>
            <CardDescription>최근 갱신 순(표본)으로 전체 흐름을 빠르게 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : null}
            {recentJobs.map((job) => (
              <div
                key={job.jobId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{job.contentId}</Badge>
                    <Badge variant="secondary">{formatStatusLabel(job.status)}</Badge>
                    {job.contentType ? (
                      <span className="text-xs text-muted-foreground">{job.contentType}</span>
                    ) : null}
                  </div>
                  <p className="font-medium">{job.videoTitle}</p>
                  <p className="text-xs text-muted-foreground">{job.updatedAt}</p>
                </div>
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/jobs/${job.jobId}/overview`}
                >
                  상세
                </Link>
              </div>
            ))}
            {!jobsQuery.isLoading && recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 생성된 제작 아이템이 없습니다.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
