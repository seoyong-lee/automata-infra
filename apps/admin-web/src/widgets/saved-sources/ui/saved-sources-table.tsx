'use client';

import type { SourceItemGql } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import Link from 'next/link';

import type { MergedRow } from '../types';

function statusLabelKo(status: SourceItemGql['status']): string {
  switch (status) {
    case 'IDEATING':
      return '기획';
    case 'READY_FOR_DISTRIBUTION':
      return '배포 가능';
    case 'ARCHIVED':
      return '보관';
    default:
      return status;
  }
}

type Props = {
  rows: MergedRow[];
  jobCountBySource: Record<string, number>;
  onOpenDetail: (id: string) => void;
};

export function SavedSourcesTable({ rows, jobCountBySource, onOpenDetail }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <th className="px-3 py-2">제목</th>
            <th className="px-3 py-2">채널</th>
            <th className="px-3 py-2">상태</th>
            <th className="px-3 py-2">연결된 제작</th>
            <th className="px-3 py-2">갱신</th>
            <th className="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const s = row.source;
            const cnt = jobCountBySource[s.id] ?? 0;
            return (
              <tr key={`${row.channelId}-${s.id}`} className="border-b border-border/80">
                <td className="px-3 py-2 font-medium">
                  <span className="line-clamp-2">{s.topic}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.channelLabel}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="font-normal">
                    {statusLabelKo(s.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{cnt}건</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(s.updatedAt).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => onOpenDetail(s.id)}
                    >
                      보기
                    </Button>
                    <Link
                      href={`/content/${encodeURIComponent(row.channelId)}/jobs/new`}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      이 채널에서 제작
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
