'use client';

import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@packages/ui/card';
import Link from 'next/link';

export type DashboardChannelRow = {
  contentId: string;
  contentHref: string;
  totalJobs: number;
  uploadedCount: number;
  blockedCount: number;
  contentLabel: string;
};

type Props = {
  channelRows: DashboardChannelRow[];
};

export function DashboardChannelSummarySection({ channelRows }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="dash-channel-heading">
      <h2 id="dash-channel-heading" className="text-lg font-semibold tracking-tight">
        채널별 상태
      </h2>
      <Card>
        <CardHeader>
          <CardDescription>
            채널 단위로 제작 아이템 수·업로드 완료·막힌 작업(실패·검수 대기)을 봅니다.
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{row.contentLabel}</p>
                <p className="text-xs text-muted-foreground">
                  업로드 완료 {row.uploadedCount} · 막힘 {row.blockedCount}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{row.totalJobs}건</Badge>
                <Link
                  className="text-sm font-medium text-primary hover:underline"
                  href={row.contentHref}
                >
                  채널 작업함
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
