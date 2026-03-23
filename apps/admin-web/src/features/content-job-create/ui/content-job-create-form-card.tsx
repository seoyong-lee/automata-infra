'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import { ChangeEvent, useState } from 'react';

import { useCreateDraftJob } from '@/entities/admin-job';

type DraftForm = {
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
  autoPublish: boolean;
  publishAt: string;
};

type FixedContentContext = {
  contentId: string;
  label?: string | null;
  isResolved: boolean;
};

type ContentJobCreateFormCardProps = {
  cancelLabel?: string;
  fixedContent?: FixedContentContext;
  onCancel: () => void;
  onCreated: (jobId: string) => void;
};

export function ContentJobCreateFormCard({
  cancelLabel = '취소',
  fixedContent,
  onCancel,
  onCreated,
}: ContentJobCreateFormCardProps) {
  const [form, setForm] = useState<DraftForm>({
    targetLanguage: 'ko',
    titleIdea: '',
    targetDurationSec: '45',
    stylePreset: 'mystic_daily_short',
    autoPublish: false,
    publishAt: '',
  });

  const mutation = useCreateDraftJob({
    onSuccess: ({ createDraftJob }) => {
      onCreated(createDraftJob.jobId);
    },
  });

  const onInput = (key: keyof DraftForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  const canSubmit =
    !mutation.isPending &&
    form.titleIdea.trim().length > 0 &&
    (!fixedContent || fixedContent.isResolved);

  return (
    <Card className="border-admin-outline-ghost bg-admin-surface-card shadow-sm">
      <CardHeader>
        <CardTitle>제작 아이템·토픽 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fixedContent && !fixedContent.isResolved ? (
          <p className="text-sm text-destructive">
            이 contentId에 해당하는 채널을 찾을 수 없습니다.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {fixedContent ? (
            <div className="rounded-lg border border-admin-outline-ghost bg-admin-surface-section p-4 text-sm md:col-span-2">
              <p className="text-xs text-admin-text-muted">채널</p>
              <p className="mt-1 font-medium text-admin-text-strong">{fixedContent.label ?? '…'}</p>
              <p className="mt-1 font-mono text-xs text-admin-text-muted">
                {fixedContent.contentId}
              </p>
            </div>
          ) : null}

          <label className="space-y-2 text-sm">
            <span className="font-medium">언어</span>
            <Input value={form.targetLanguage} onChange={onInput('targetLanguage')} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">목표 길이(초)</span>
            <Input
              type="number"
              value={form.targetDurationSec}
              onChange={onInput('targetDurationSec')}
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">{fixedContent ? '제목 아이디어' : '아이디어 제목'}</span>
            <Input value={form.titleIdea} onChange={onInput('titleIdea')} />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">스타일 프리셋</span>
            <Input value={form.stylePreset} onChange={onInput('stylePreset')} />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">예약 게시(선택)</span>
            <Input type="datetime-local" value={form.publishAt} onChange={onInput('publishAt')} />
          </label>
          <label className="flex items-center gap-3 rounded-md border border-admin-outline-ghost px-3 py-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.autoPublish} onChange={onInput('autoPublish')} />
            <span className="font-medium">렌더 후 자동 게시</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={canSubmit === false}
            onClick={() =>
              mutation.mutate({
                contentId: fixedContent?.contentId,
                targetLanguage: form.targetLanguage,
                titleIdea: form.titleIdea.trim(),
                targetDurationSec: Number(form.targetDurationSec),
                stylePreset: form.stylePreset,
                autoPublish: form.autoPublish,
                publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
                runTopicPlan: true,
              })
            }
          >
            {mutation.isPending ? '생성 중…' : '제작 아이템 만들기 (토픽 플랜 포함)'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>

        {mutation.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
