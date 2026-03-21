'use client';

import { useJobExecutionsQuery, useJobTimelineQuery } from '@packages/graphql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useState } from 'react';

type ContentJobDetailTimelineViewProps = {
  jobId: string;
};

export function ContentJobDetailTimelineView({ jobId }: ContentJobDetailTimelineViewProps) {
  const exec = useJobExecutionsQuery({ jobId }, { enabled: Boolean(jobId) });
  const raw = useJobTimelineQuery({ jobId }, { enabled: Boolean(jobId) });
  const [showRaw, setShowRaw] = useState(false);

  if (!jobId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>파이프라인 실행 이력</CardTitle>
          <CardDescription>
            토픽 플랜·씬 JSON·에셋 생성 뮤테이션마다 기록됩니다. 실패 시{' '}
            <code className="text-xs">errorMessage</code>를 확인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exec.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
          {exec.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(exec.error)}</p>
          ) : null}
          {(exec.data ?? []).length === 0 && !exec.isLoading ? (
            <p className="text-sm text-muted-foreground">
              아직 실행 이력이 없습니다. 뮤테이션을 실행하면 여기에 쌓입니다.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">단계</th>
                  <th className="py-2 pr-3 font-medium">상태</th>
                  <th className="py-2 pr-3 font-medium">시작</th>
                  <th className="py-2 pr-3 font-medium">완료</th>
                  <th className="py-2 pr-3 font-medium">실행자</th>
                  <th className="py-2 font-medium">오류</th>
                </tr>
              </thead>
              <tbody>
                {(exec.data ?? []).map((row) => (
                  <tr key={row.executionId} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.stageType}</td>
                    <td className="py-2 pr-3">{row.status}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{row.startedAt}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {row.completedAt ?? '—'}
                    </td>
                    <td className="py-2 pr-3 text-xs">{row.triggeredBy ?? '—'}</td>
                    <td className="py-2 text-xs text-destructive">{row.errorMessage ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">원시 타임라인 (Dynamo 행)</CardTitle>
            <CardDescription>
              디버깅·감사용. JOB# 파티션의 모든 아이템을 JSON으로 덤프합니다.
            </CardDescription>
          </div>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? '접기' : '펼치기'}
          </button>
        </CardHeader>
        {showRaw ? (
          <CardContent className="space-y-3">
            {raw.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
            {raw.error ? (
              <p className="text-sm text-destructive">{getErrorMessage(raw.error)}</p>
            ) : null}
            <ul className="max-h-[24rem] space-y-2 overflow-auto text-xs">
              {(raw.data ?? []).map((row) => (
                <li
                  key={`${row.pk}#${row.sk}`}
                  className="rounded-md border border-border p-3 font-mono"
                >
                  <div className="text-[11px] text-muted-foreground">
                    {row.pk} · {row.sk}
                  </div>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                    {row.data}
                  </pre>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
