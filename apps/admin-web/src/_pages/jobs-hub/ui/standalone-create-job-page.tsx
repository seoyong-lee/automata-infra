'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, Suspense, useState } from 'react';

import { useCreateDraftJob } from '@/entities/admin-job';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

type DraftForm = {
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
  autoPublish: boolean;
  publishAt: string;
};

function StandaloneCreateJobContent() {
  const router = useRouter();

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
      router.push(`/jobs/${createDraftJob.jobId}/overview`);
    },
  });

  const onInput = (key: keyof DraftForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageBack href="/jobs" label="잡 목록으로" />
        <AdminPageHeader
          title="잡 만들기"
          subtitle="잡을 만듭니다. 채널은 이후 잡 목록에서 연결할 수 있습니다."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>잡·토픽 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              <span className="font-medium">아이디어 제목</span>
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
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.autoPublish} onChange={onInput('autoPublish')} />
              <span className="font-medium">렌더 후 자동 게시</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending || !form.titleIdea.trim()}
              onClick={() =>
                mutation.mutate({
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
              {mutation.isPending ? '생성 중…' : '잡 만들기 (토픽 플랜 포함)'}
            </Button>
            <Link
              href="/jobs"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              취소
            </Link>
          </div>
          {mutation.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function StandaloneCreateJobPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-3">
            <AdminPageBack href="/jobs" label="잡 목록으로" />
            <AdminPageHeader title="미연결 잡 만들기" subtitle="불러오는 중…" />
          </div>
        </div>
      }
    >
      <StandaloneCreateJobContent />
    </Suspense>
  );
}
