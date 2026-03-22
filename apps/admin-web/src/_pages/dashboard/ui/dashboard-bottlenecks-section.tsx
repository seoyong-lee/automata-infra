'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { DASHBOARD_STALE_MS, type DashboardBottlenecks } from '../lib/dashboard-model';

function hoursStaleLabel(): string {
  return `${Math.round(DASHBOARD_STALE_MS / (60 * 60 * 1000))}시간`;
}

const ghostLinkClass =
  'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-primary hover:bg-accent hover:text-accent-foreground';

type Props = {
  bottlenecks: DashboardBottlenecks;
};

export function DashboardBottlenecksSection({ bottlenecks }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="dash-bottleneck-heading">
      <h2 id="dash-bottleneck-heading" className="text-lg font-semibold tracking-tight">
        병목·주의
      </h2>
      <p className="text-sm text-muted-foreground">
        장기 체류는 마지막 갱신 시각이{' '}
        <strong className="text-foreground">{hoursStaleLabel()}</strong>을 넘긴 경우입니다.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">씬 JSON 단계 장기 체류</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {bottlenecks.sceneJsonLongDwell}
            </span>
            <Link href="/executions" className={ghostLinkClass}>
              실행 모니터링
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">에셋 생성 장기 체류</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {bottlenecks.assetGenLongDwell}
            </span>
            <Link href="/executions" className={ghostLinkClass}>
              실행 모니터링
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">실패 건수</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xl font-semibold tabular-nums">{bottlenecks.failedJobs}</span>
            <Link href="/jobs" className={ghostLinkClass}>
              실패 항목 열기
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
