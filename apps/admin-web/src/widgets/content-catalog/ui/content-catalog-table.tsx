'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@packages/ui/table';
import type { AdminContent } from '@/entities/admin-content';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  items: AdminContent[];
  isLoading: boolean;
  onDelete: (contentId: string) => void;
  deletingId: string | undefined;
};

export function ContentCatalogTable({ items, isLoading, onDelete, deletingId }: Props) {
  const router = useRouter();

  return (
    <Card className="flex w-full flex-col gap-4">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">콘텐츠(채널) 목록</CardTitle>
          <CardDescription>
            한 단위로 콘텐츠를 등록한 뒤, 상세에서 그 하위에 제작 잡을 만듭니다.
          </CardDescription>
        </div>
        <Link
          href="/content/new"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          콘텐츠 추가
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {!isLoading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p>
        ) : null}
        {!isLoading && items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="hidden md:table-cell font-mono text-xs">ID</TableHead>
                <TableHead className="w-[200px] text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.contentId}>
                  <TableCell className="font-medium">{c.label}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {c.contentId}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/content/${c.contentId}/jobs`)}
                      >
                        잡 관리
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={deletingId === c.contentId}
                        onClick={() => {
                          if (
                            window.confirm(
                              `「${c.label}」을(를) 삭제하면 하위 잡까지 모두 삭제됩니다. 계속할까요?`,
                            )
                          ) {
                            onDelete(c.contentId);
                          }
                        }}
                      >
                        {deletingId === c.contentId ? '삭제 중…' : '삭제'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
