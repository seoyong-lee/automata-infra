'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAdminJobs, usePendingReviews } from '@/entities/admin-job';
import { useYoutubeChannelConfigs } from '@/entities/youtube-channel';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const formatStatusLabel = (status: string) => {
  return status.toLowerCase().replace(/_/g, ' ');
};

export function DashboardPage() {
  const jobsQuery = useAdminJobs({ limit: 100 });
  const pendingReviewsQuery = usePendingReviews({ limit: 50 });
  const youtubeChannelsQuery = useYoutubeChannelConfigs();

  const jobs = jobsQuery.data?.items ?? [];
  const pendingReviews = pendingReviewsQuery.data?.items ?? [];
  const youtubeChannels = youtubeChannelsQuery.data ?? [];

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
      { title: 'Total Jobs', value: metrics.totalJobs, href: '/jobs' },
      {
        title: 'Rendered / Uploaded',
        value: metrics.renderedJobs,
        href: '/reviews',
      },
      {
        title: 'Pending Review',
        value: metrics.pendingReviews,
        href: '/reviews',
      },
      {
        title: 'Asset Backlog',
        value: metrics.assetBacklog,
        href: '/reviews',
      },
      {
        title: 'Failed Jobs',
        value: metrics.failedJobs,
        href: '/reviews',
      },
    ];
  }, [metrics]);

  const channelRows = useMemo(() => {
    const channelIds = Array.from(
      new Set([
        ...youtubeChannels.map((item) => item.channelId),
        ...jobs.map((item) => item.channelId),
      ]),
    ).sort();

    return channelIds.map((channelId) => {
      const channelJobs = jobs.filter((job) => job.channelId === channelId);
      const uploadedCount = channelJobs.filter((job) => job.status === 'UPLOADED').length;
      const blockedCount = channelJobs.filter(
        (job) => job.status === 'FAILED' || job.status === 'REVIEW_PENDING',
      ).length;
      return {
        channelId,
        totalJobs: channelJobs.length,
        uploadedCount,
        blockedCount,
      };
    });
  }, [jobs, youtubeChannels]);

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
        subtitle="모든 콘텐츠를 한곳에서 묶어 병목·에러·리뷰 대기·업로드 진행 상태를 파악하는 운영 현황입니다."
        actions={
          <>
            <Button variant="secondary" onClick={() => (window.location.href = '/jobs')}>
              콘텐츠 관리
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/settings')}>
              설정
            </Button>
          </>
        }
      />

      {jobsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
      ) : null}
      {pendingReviewsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pendingReviewsQuery.error)}</p>
      ) : null}
      {youtubeChannelsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(youtubeChannelsQuery.error)}</p>
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
                Open in Content Manager
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Channel Health</CardTitle>
            <CardDescription>
              유튜브 채널 단위로 현재 잡 수, 업로드 완료 수, 막힌 작업 수를 봅니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 집계할 채널이 없습니다. 먼저 콘텐츠 채널을 추가하거나 잡을 생성하세요.
              </p>
            ) : null}
            {channelRows.map((row) => (
              <div
                key={row.channelId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium">{row.channelId}</p>
                  <p className="text-xs text-muted-foreground">
                    uploaded {row.uploadedCount} / blocked {row.blockedCount}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{row.totalJobs} jobs</Badge>
                  <Link
                    className="text-sm text-primary hover:underline"
                    href={`/jobs?channelId=${encodeURIComponent(row.channelId)}`}
                  >
                    Open content
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Bottlenecks</CardTitle>
            <CardDescription>
              전체 콘텐츠 기준으로 지금 막히는 구간을 빠르게 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bottlenecks.map((item) => (
              <div key={item.label} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.label}</p>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p>
                <Link
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                  href={item.href}
                >
                  Open in Content Manager
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Experiment Program</CardTitle>
          <CardDescription>
            콘텐츠 밖 글로벌 대시보드에서는 어떤 옵션 축을 개발 중인지와 비교 방향을 통합해서
            봅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {experimentLanes.map((lane) => (
            <div key={lane.title} className="rounded-lg border p-4">
              <p className="font-medium">{lane.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{lane.note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lane.items.map((item) => (
                  <span key={item} className="rounded-md bg-muted px-2 py-1 text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Jobs</CardTitle>
          <CardDescription>
            최근 업데이트된 잡을 기준으로 전체 콘텐츠 흐름을 빠르게 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          ) : null}
          {recentJobs.map((job) => (
            <div
              key={job.jobId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{job.channelId}</Badge>
                  <Badge variant="secondary">{formatStatusLabel(job.status)}</Badge>
                  {job.contentType ? (
                    <span className="text-xs text-muted-foreground">{job.contentType}</span>
                  ) : null}
                </div>
                <p className="font-medium">{job.videoTitle}</p>
                <p className="text-xs text-muted-foreground">{job.updatedAt}</p>
              </div>
              <Link className="text-sm text-primary hover:underline" href={`/jobs/${job.jobId}`}>
                Open detail
              </Link>
            </div>
          ))}
          {!jobsQuery.isLoading && recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 생성된 잡이 없습니다.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
