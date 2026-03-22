'use client';

import { cn } from '@packages/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import type { DashboardActionQueue } from '../lib/dashboard-model';

type Props = {
  actionQueue: DashboardActionQueue;
};

export function DashboardActionQueueSection({ actionQueue }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="dash-action-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="dash-action-heading" className="text-lg font-semibold tracking-tight">
          오늘 처리할 일
        </h2>
        <p className="text-xs text-muted-foreground">
          먼저 숫자가 큰 항목부터 확인하는 것을 권장합니다.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/25 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">검수 필요</CardTitle>
            <CardDescription>검수함·상태 기준 중 큰 값</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold tabular-nums">{actionQueue.reviewNeeded}</p>
            <Link
              href="/reviews"
              className={cn(
                'inline-flex h-8 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto',
              )}
            >
              검수함에서 처리
            </Link>
          </CardContent>
        </Card>
        <Card className="border-amber-500/25 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">실패·막힘</CardTitle>
            <CardDescription>FAILED + 파이프라인 장기 체류</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold tabular-nums">{actionQueue.failedOrBlocked}</p>
            <Link
              href="/jobs"
              className={cn(
                'inline-flex h-8 w-full items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 sm:w-auto',
              )}
            >
              전체 제작 아이템에서 보기
            </Link>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">업로드 대기</CardTitle>
            <CardDescription>예약·큐 직전 상태</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold tabular-nums">{actionQueue.uploadPending}</p>
            <Link
              href="/jobs"
              className={cn(
                'inline-flex h-8 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground sm:w-auto',
              )}
            >
              해당 작업 찾기
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
