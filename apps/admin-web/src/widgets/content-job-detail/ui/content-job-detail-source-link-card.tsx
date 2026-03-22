'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import {
  useCreateSourceItemMutation,
  useSetJobSourceItemMutation,
  useSourceItemQuery,
  useSourceItemsForChannelQuery,
} from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SimpleModal } from '@/shared/ui/simple-modal';

type ContentJobDetailSourceLinkCardProps = {
  jobId: string;
  contentId?: string | null;
  sourceItemId?: string | null;
};

export function ContentJobDetailSourceLinkCard({
  jobId,
  contentId,
  sourceItemId,
}: ContentJobDetailSourceLinkCardProps) {
  const queryClient = useQueryClient();
  const channelOk =
    Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID && Boolean(contentId?.trim());

  const sourceQuery = useSourceItemQuery(
    { id: sourceItemId ?? '' },
    { enabled: Boolean(sourceItemId) },
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newHook, setNewHook] = useState('');

  const listQuery = useSourceItemsForChannelQuery(
    { channelId: contentId ?? '' },
    { enabled: pickerOpen && channelOk },
  );

  const setSource = useSetJobSourceItemMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      setPickerOpen(false);
      setNewTopic('');
      setNewHook('');
    },
  });

  const createAndLink = useCreateSourceItemMutation({
    onSuccess: async (data) => {
      const id = data.createSourceItem.id;
      await queryClient.invalidateQueries({ queryKey: ['sourceItemsForChannel', contentId ?? ''] });
      setSource.mutate({ jobId, sourceItemId: id });
    },
  });

  const linkExisting = (sid: string) => {
    setSource.mutate({ jobId, sourceItemId: sid });
  };

  const handleCreateAndLink = () => {
    if (!channelOk || !contentId || !newTopic.trim()) return;
    createAndLink.mutate({
      channelId: contentId,
      topic: newTopic.trim(),
      masterHook: newHook.trim() || undefined,
    });
  };

  const linked = sourceQuery.data;
  const err =
    setSource.error ?? createAndLink.error ?? sourceQuery.error ?? listQuery.error ?? null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>소재 연결</CardTitle>
          <CardDescription>
            이 제작 아이템이 어떤 소재(Source)를 기반으로 하는지 정합니다. 채널에 연결된 작업만
            소재를 불러올 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!channelOk ? (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              채널이 연결되지 않았습니다. 제작 아이템 허브에서 채널을 먼저 연결하세요.
            </p>
          ) : null}

          {sourceItemId && linked ? (
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{linked.topic}</span>
                <Badge variant="secondary" className="font-normal">
                  {linked.status}
                </Badge>
              </div>
              {linked.masterHook ? (
                <p className="text-muted-foreground">
                  <span className="text-xs font-medium text-foreground">핵심 훅</span> ·{' '}
                  {linked.masterHook}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground font-mono">ID {linked.id}</p>
              <p className="text-xs text-muted-foreground">
                생성 {new Date(linked.createdAt).toLocaleString()}
              </p>
            </div>
          ) : null}

          {sourceItemId && sourceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">소재 정보를 불러오는 중…</p>
          ) : null}

          {!sourceItemId && channelOk ? (
            <p className="text-sm text-muted-foreground">아직 연결된 소재가 없습니다.</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!channelOk || setSource.isPending}
              onClick={() => setPickerOpen(true)}
            >
              {sourceItemId ? '소재 변경…' : '소재 연결…'}
            </Button>
          </div>

          {err ? <p className="text-sm text-destructive">{getErrorMessage(err)}</p> : null}
        </CardContent>
      </Card>

      <SimpleModal
        open={pickerOpen}
        title="소재 선택 또는 새로 만들기"
        onClose={() => setPickerOpen(false)}
      >
        <p className="text-sm text-muted-foreground">
          이 채널에 등록된 소재 목록에서 고르거나, 바로 새 소재를 만든 뒤 이 작업에 연결합니다.
        </p>

        {listQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">목록 불러오는 중…</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {(listQuery.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">등록된 소재가 없습니다.</li>
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

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">새 소재 만들고 연결</p>
          <label className="flex flex-col gap-1 text-sm">
            <span>주제</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="소재 제목"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1 text-sm">
            <span>핵심 훅 (선택)</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={newHook}
              onChange={(e) => setNewHook(e.target.value)}
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              닫기
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                createAndLink.isPending || setSource.isPending || !newTopic.trim() || !channelOk
              }
              onClick={handleCreateAndLink}
            >
              {createAndLink.isPending || setSource.isPending ? '처리 중…' : '만들고 연결'}
            </Button>
          </div>
        </div>
      </SimpleModal>
    </>
  );
}
