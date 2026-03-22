'use client';

import { Button } from '@packages/ui/button';
import type { AdminContent } from '@packages/graphql';
import { useCreateSourceItemMutation } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SimpleModal } from '@/shared/ui/simple-modal';

type CreateSourceItemDialogProps = {
  open: boolean;
  onClose: () => void;
  channels: AdminContent[];
};

export function CreateSourceItemDialog({ open, onClose, channels }: CreateSourceItemDialogProps) {
  const queryClient = useQueryClient();
  const [channelId, setChannelId] = useState('');
  const [topic, setTopic] = useState('');
  const [masterHook, setMasterHook] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');

  const createSource = useCreateSourceItemMutation({
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['sourceItemsForChannel', vars.channelId] });
      onClose();
      setTopic('');
      setMasterHook('');
      setSourceNotes('');
      setChannelId('');
    },
  });

  const handleSubmit = () => {
    if (!channelId.trim() || !topic.trim()) return;
    createSource.mutate({
      channelId: channelId.trim(),
      topic: topic.trim(),
      masterHook: masterHook.trim() || undefined,
      sourceNotes: sourceNotes.trim() || undefined,
    });
  };

  return (
    <SimpleModal open={open} title="새 소재 만들기" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        소재(Source)는 채널에 귀속된 상위 기획 단위입니다. 제작 아이템 개요에서 이 소재를 연결할 수
        있습니다.
      </p>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">채널</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
        >
          <option value="">선택…</option>
          {channels.map((c) => (
            <option key={c.contentId} value={c.contentId}>
              {c.label} ({c.contentId})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">주제 · 제목</span>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 주간 운세 요약 — 화요일 편"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">핵심 훅 (선택)</span>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={masterHook}
          onChange={(e) => setMasterHook(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">메모 (선택)</span>
        <textarea
          className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={sourceNotes}
          onChange={(e) => setSourceNotes(e.target.value)}
        />
      </label>
      {createSource.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(createSource.error)}</p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          disabled={createSource.isPending || !channelId || !topic.trim()}
          onClick={handleSubmit}
        >
          {createSource.isPending ? '만드는 중…' : '소재 생성'}
        </Button>
      </div>
    </SimpleModal>
  );
}
