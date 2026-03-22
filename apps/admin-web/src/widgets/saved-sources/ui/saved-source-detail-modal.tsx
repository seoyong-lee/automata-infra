'use client';

import { useSourceItemQuery, type SourceItemGql } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';

import { SimpleModal } from '@/shared/ui/simple-modal';

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

function SourceDetailBody({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useSourceItemQuery({ id }, { enabled: Boolean(id) });
  const s = q.data;
  return (
    <>
      {q.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
      {q.error ? (
        <p className="text-sm text-destructive">소재를 불러오지 못했습니다.</p>
      ) : null}
      {s ? (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">제목</p>
            <p className="font-medium">{s.topic}</p>
          </div>
          {s.masterHook ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">핵심 훅</p>
              <p>{s.masterHook}</p>
            </div>
          ) : null}
          {s.sourceNotes ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">메모</p>
              <p className="whitespace-pre-wrap">{s.sourceNotes}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{statusLabelKo(s.status)}</Badge>
            <span className="text-xs text-muted-foreground font-mono">ID {s.id}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            생성 {new Date(s.createdAt).toLocaleString('ko-KR')} · 갱신{' '}
            {new Date(s.updatedAt).toLocaleString('ko-KR')}
          </p>
        </div>
      ) : null}
      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
    </>
  );
}

type Props = {
  detailId: string | null;
  onClose: () => void;
};

export function SavedSourceDetailModal({ detailId, onClose }: Props) {
  return (
    <SimpleModal open={Boolean(detailId)} title="소재 상세" onClose={onClose}>
      {detailId ? <SourceDetailBody id={detailId} onClose={onClose} /> : null}
    </SimpleModal>
  );
}
