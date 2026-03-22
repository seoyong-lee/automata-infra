'use client';

import {
  useChannelPublishQueueQuery,
  useRunPublishOrchestrationMutation,
  useUpdatePublishTargetScheduleMutation,
  type ChannelPublishQueueItem,
  type PublishTarget,
} from '@packages/graphql';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ContentChannelSubnav } from '@/widgets/content-channel';
import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs } from '@/entities/admin-job';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function formatDateTimeLocal(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function rowStatusLabel(row: ChannelPublishQueueItem): string {
  if (row.status === 'PUBLISHED') {
    return '처리 완료';
  }
  if (row.status === 'SCHEDULED' && row.scheduledAt) {
    return `예약됨 · ${new Date(row.scheduledAt).toLocaleString()}`;
  }
  return '즉시 발행 가능';
}

function targetStatusLabel(target: PublishTarget): string {
  if (target.status === 'SCHEDULED' && target.scheduledAt) {
    return `예약 · ${new Date(target.scheduledAt).toLocaleString()}`;
  }
  switch (target.status) {
    case 'PUBLISHED':
      return '발행 완료';
    case 'PUBLISHING':
      return '발행 중';
    case 'FAILED':
      return '실패';
    case 'SKIPPED':
      return '건너뜀';
    default:
      return '즉시 실행 대기';
  }
}

function isRunnableTarget(target: PublishTarget): boolean {
  if (target.status === 'QUEUED') {
    return true;
  }
  if (target.status !== 'SCHEDULED' || !target.scheduledAt) {
    return false;
  }
  return new Date(target.scheduledAt).getTime() <= Date.now();
}

function titleForJob(
  jobId: string,
  jobs: { jobId: string; videoTitle: string }[] | undefined,
): string {
  return jobs?.find((job) => job.jobId === jobId)?.videoTitle ?? jobId;
}

export function ChannelPublishSchedulePage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const contentsQuery = useAdminContents({ limit: 200 });
  const jobsQuery = useAdminJobs({ contentId, limit: 200 });
  const label = useMemo(() => {
    return contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label;
  }, [contentsQuery.data?.items, contentId]);
  const selectedJobId = searchParams.get('job') ?? '';

  const queueQuery = useChannelPublishQueueQuery({ contentId }, { enabled: Boolean(contentId) });
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const invalidateScheduleData = async (jobId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['channelPublishQueue', contentId] });
    await queryClient.invalidateQueries({ queryKey: ['publishTargetsForJob', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
  };

  const updateTargetSchedule = useUpdatePublishTargetScheduleMutation();
  const runPublishOrchestration = useRunPublishOrchestrationMutation();

  const rows = useMemo(() => {
    const items = queueQuery.data ?? [];
    return [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [queueQuery.data]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let runnable = 0;
    let completed = 0;
    for (const row of rows) {
      if (row.status === 'PUBLISHED') {
        completed += 1;
      } else if (row.publishTargets.some((target) => isRunnableTarget(target))) {
        runnable += 1;
      } else if (row.publishTargets.some((target) => target.status === 'SCHEDULED')) {
        scheduled += 1;
      }
    }
    return { scheduled, runnable, completed };
  }, [rows]);

  const handleDraftChange = (publishTargetId: string, value: string) => {
    setScheduleDrafts((current) => ({
      ...current,
      [publishTargetId]: value,
    }));
  };

  const handleSaveSchedule = async (
    jobId: string,
    publishTargetId: string,
    draftValue: string,
  ) => {
    setActiveTargetId(publishTargetId);
    try {
      await updateTargetSchedule.mutateAsync({
        jobId,
        publishTargetId,
        scheduledAt: draftValue ? new Date(draftValue).toISOString() : null,
      });
      await invalidateScheduleData(jobId);
    } finally {
      setActiveTargetId(null);
    }
  };

  const handleRun = async (jobId: string) => {
    setActiveJobId(jobId);
    try {
      await runPublishOrchestration.mutateAsync({ jobId });
      await invalidateScheduleData(jobId);
    } finally {
      setActiveJobId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref="/content"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                채널
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">{(label ?? contentId) || '—'}</span>
            </div>
          }
          title={
            label ? `「${label}」의 예약·발행` : contentId ? '이 채널의 예약·발행' : '예약·발행'
          }
          subtitle="출고 큐에 올라온 항목의 예약 시각을 조정하고, 즉시 또는 도래한 예약 항목을 실행합니다."
        />
      </div>

      <ContentChannelSubnav contentId={contentId} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">즉시 실행 가능</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.runnable}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">예약 대기</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.scheduled}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">처리 완료</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.completed}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        예약은 매체 대상별로 저장됩니다. 예약 시각이 비어 있으면 즉시 실행 대기 상태로 두고, 시간이
        지난 예약만 실행 버튼의 대상이 됩니다.
      </p>

      {queueQuery.isLoading ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          예약·발행할 항목이 없습니다. 먼저 <Link href={`/content/${encodeURIComponent(contentId)}/queue`} className="text-primary hover:underline">출고 큐</Link>에 제작 아이템을 추가하세요.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const runnableCount = row.publishTargets.filter((target) => isRunnableTarget(target)).length;
            const rowSelected = selectedJobId === row.jobId;
            return (
              <section
                key={row.queueItemId}
                className={`rounded-lg border p-5 ${rowSelected ? 'border-primary' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        <Link
                          href={`/jobs/${encodeURIComponent(row.jobId)}/publish`}
                          className="hover:text-primary"
                        >
                          {titleForJob(row.jobId, jobsQuery.data?.items)}
                        </Link>
                      </h2>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        {rowStatusLabel(row)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      큐 순서 {rows.findIndex((item) => item.queueItemId === row.queueItemId) + 1} ·
                      추가일 {new Date(row.createdAt).toLocaleString()}
                    </p>
                    {row.note ? <p className="text-sm text-muted-foreground">{row.note}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/content/${encodeURIComponent(contentId)}/queue`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
                    >
                      큐 보기
                    </Link>
                    <button
                      type="button"
                      disabled={runnableCount === 0 || activeJobId === row.jobId}
                      onClick={() => void handleRun(row.jobId)}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {activeJobId === row.jobId
                        ? '실행 중…'
                        : runnableCount > 0
                          ? `지금 실행 (${runnableCount})`
                          : '예약 대기 중'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {row.publishTargets.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      생성된 출고 대상이 없습니다.
                    </div>
                  ) : (
                    row.publishTargets.map((target) => {
                      const draftValue =
                        scheduleDrafts[target.publishTargetId] ??
                        formatDateTimeLocal(target.scheduledAt);
                      const locked =
                        target.status === 'PUBLISHED' || target.status === 'PUBLISHING';
                      return (
                        <div
                          key={target.publishTargetId}
                          className="space-y-3 rounded-md border p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{target.platform}</p>
                            <span className="text-xs text-muted-foreground">
                              {targetStatusLabel(target)}
                            </span>
                          </div>

                          <label className="block space-y-1 text-sm">
                            <span className="text-muted-foreground">예약 시각</span>
                            <input
                              type="datetime-local"
                              value={draftValue}
                              disabled={locked}
                              onChange={(e) =>
                                handleDraftChange(target.publishTargetId, e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={locked || activeTargetId === target.publishTargetId}
                              onClick={() =>
                                void handleSaveSchedule(
                                  row.jobId,
                                  target.publishTargetId,
                                  draftValue,
                                )
                              }
                              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {activeTargetId === target.publishTargetId ? '저장 중…' : '예약 저장'}
                            </button>
                            <button
                              type="button"
                              disabled={
                                locked ||
                                activeTargetId === target.publishTargetId ||
                                (!draftValue && !target.scheduledAt)
                              }
                              onClick={() =>
                                void handleSaveSchedule(row.jobId, target.publishTargetId, '')
                              }
                              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              예약 해제
                            </button>
                          </div>

                          {target.externalUrl ? (
                            <a
                              href={target.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-sm text-primary hover:underline"
                            >
                              외부 링크 열기
                            </a>
                          ) : null}
                          {target.publishError ? (
                            <p className="text-sm text-destructive">{target.publishError}</p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {updateTargetSchedule.error ? (
        <p className="text-sm text-destructive">{updateTargetSchedule.error.message}</p>
      ) : null}
      {runPublishOrchestration.error ? (
        <p className="text-sm text-destructive">{runPublishOrchestration.error.message}</p>
      ) : null}
    </div>
  );
}
