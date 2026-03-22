'use client';

import {
  useSetJobSourceItemMutation,
  useSourceItemsForChannelQuery,
} from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { SimpleModal } from '@/shared/ui/simple-modal';

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  contentId: string;
  discoveryHref: string;
  channelOk: boolean;
};

export function ContentJobDetailSourcePickerModal({
  open,
  onClose,
  jobId,
  contentId,
  discoveryHref,
  channelOk,
}: Props) {
  const queryClient = useQueryClient();
  const listQuery = useSourceItemsForChannelQuery(
    { channelId: contentId },
    { enabled: open && channelOk },
  );

  const setSource = useSetJobSourceItemMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      onClose();
    },
  });

  const linkExisting = (sid: string) => {
    setSource.mutate({ jobId, sourceItemId: sid });
  };

  return (
    <SimpleModal open={open} title="이 채널의 소재 선택" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        아래는 이 채널에 이미 저장된 소재입니다. 새 소재는{' '}
        <Link href={discoveryHref} className="font-medium text-primary underline underline-offset-4">
          소재 발굴
        </Link>
        에서 만든 뒤 여기서 연결하세요.
      </p>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">목록 불러오는 중…</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {(listQuery.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">
              등록된 소재가 없습니다. 소재 발굴에서 새 소재를 만드세요.
            </li>
          ) : (
            (listQuery.data ?? []).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-transparent px-2 py-1 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.topic}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{s.id}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={setSource.isPending}
                  onClick={() => linkExisting(s.id)}
                >
                  연결
                </Button>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
    </SimpleModal>
  );
}
