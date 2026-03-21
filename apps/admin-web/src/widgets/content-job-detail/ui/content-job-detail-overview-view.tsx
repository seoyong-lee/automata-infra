'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { ExperimentOption, JobDraftDetail } from '../model';
import { getPipelineStageIndex, PIPELINE_STAGE_LABELS } from '../lib/pipeline-stage';

type ContentJobDetailOverviewViewProps = {
  jobId: string;
  detail?: JobDraftDetail;
  experimentOptions: ExperimentOption[];
  readyAssetCount: number;
  stylePreset: string;
};

export function ContentJobDetailOverviewView({
  jobId,
  detail,
  experimentOptions,
  readyAssetCount,
  stylePreset,
}: ContentJobDetailOverviewViewProps) {
  const status = detail?.job.status ?? 'DRAFT';
  const stageIdx = getPipelineStageIndex(status);
  const contentId = detail?.job.contentId;
  const channelLinked = Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>제작 아이템 요약</CardTitle>
          <CardDescription>
            채널·상태·길이를 한곳에 두고, 아래에서 단계별 후보·채택·실행 이력으로 이어갑니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">제목</p>
              <p className="mt-1 font-medium leading-snug">{detail?.job.videoTitle ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">상태</p>
              <p className="mt-1">
                <Badge variant="secondary" className="font-normal">
                  {status}
                </Badge>
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">목표 길이</p>
              <p className="mt-1 font-medium tabular-nums">
                {detail?.job.targetDurationSec != null ? `${detail.job.targetDurationSec}s` : '—'}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-muted-foreground">채널</p>
              <p className="mt-1">
                {channelLinked && contentId ? (
                  <Link
                    href={`/content/${encodeURIComponent(contentId)}/jobs`}
                    className="font-medium text-primary hover:underline"
                  >
                    {contentId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">미연결 · 제작 아이템 허브에서 연결</span>
                )}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">대략적 진행 단계</p>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGE_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    i === stageIdx
                      ? 'border-primary bg-primary/10 font-medium text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              표시는 상태 기준 근사치입니다. 세부 단계는 각 탭·실행 이력에서 확인하세요.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Link
              href={`/jobs/${jobId}/ideation`}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              새 후보 생성 (아이데이션)
            </Link>
            <Link
              href={`/jobs/${jobId}/timeline`}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              실행 이력
            </Link>
            <Link
              href="/reviews"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              검수 큐
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>채택 라인 (승인 스냅샷)</CardTitle>
          <CardDescription>
            각 단계에서 &quot;이 실행을 채택&quot;으로 기록한 executionId입니다. 파이프라인 입력은
            추후 이 포인터를 우선합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">토픽 플랜</p>
            <p className="mt-1 font-mono text-xs break-all">
              {detail?.job.approvedTopicExecutionId ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">씬 JSON</p>
            <p className="mt-1 font-mono text-xs break-all">
              {detail?.job.approvedSceneExecutionId ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">에셋 생성</p>
            <p className="mt-1 font-mono text-xs break-all">
              {detail?.job.approvedAssetExecutionId ?? '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>운영 스냅샷</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">최근 업로드</p>
            <p className="mt-1 font-medium">{detail?.job.uploadVideoId ?? '아직 없음'}</p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">검수 큐</p>
            <p className="mt-1 font-medium">{detail?.job.reviewAction ?? 'PENDING'}</p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">에셋 준비</p>
            <p className="mt-1 font-medium">
              {readyAssetCount}/{detail?.assets.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">스타일 프리셋</p>
            <p className="mt-1 font-medium">{stylePreset || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>실험·지표 힌트</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experimentOptions.map((item) => (
            <div key={item.title} className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-medium">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
