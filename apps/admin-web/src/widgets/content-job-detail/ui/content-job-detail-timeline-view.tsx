'use client';

import { useJobTimelineQuery } from '@packages/graphql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

type ContentJobDetailTimelineViewProps = {
  jobId: string;
};

export function ContentJobDetailTimelineView({ jobId }: ContentJobDetailTimelineViewProps) {
  const q = useJobTimelineQuery({ jobId }, { enabled: Boolean(jobId) });

  if (!jobId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>실행 이력</CardTitle>
        <CardDescription>
          DynamoDB에 적재된 타임라인 이벤트입니다. 상세 원문은 <code className="text-xs">data</code>{' '}
          JSON을 참고하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {q.error ? <p className="text-sm text-destructive">{getErrorMessage(q.error)}</p> : null}
        {(q.data ?? []).length === 0 && !q.isLoading ? (
          <p className="text-sm text-muted-foreground">기록된 타임라인 항목이 없습니다.</p>
        ) : null}
        <ul className="max-h-[32rem] space-y-2 overflow-auto text-xs">
          {(q.data ?? []).map((row) => (
            <li
              key={`${row.pk}#${row.sk}`}
              className="rounded-md border border-border p-3 font-mono"
            >
              <div className="text-[11px] text-muted-foreground">
                {row.pk} · {row.sk}
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {row.data}
              </pre>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
