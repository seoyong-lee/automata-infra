'use client';

import { Badge } from '@packages/ui/badge';
import Link from 'next/link';

import { PIPELINE_STAGE_LABELS } from '../../lib/pipeline-stage';
import type { JobDraftDetail } from '../../model';

type Props = {
  detail?: JobDraftDetail;
  status: string;
  stageIdx: number;
  channelLinked: boolean;
  contentId?: string | null;
};

export function ContentJobDetailOverviewSummaryGrid({
  detail,
  status,
  stageIdx,
  channelLinked,
  contentId,
}: Props) {
  return (
    <>
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
    </>
  );
}
