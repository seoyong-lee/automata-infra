'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, Suspense, useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';
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

function CreateJobInContentContent() {
  const router = useRouter();
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const contentsQuery = useAdminContents({ limit: 100 });
  const content = useMemo(
    () => contentsQuery.data?.items.find((c) => c.contentId === contentId),
    [contentsQuery.data?.items, contentId],
  );

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
      router.push(`/jobs/${createDraftJob.jobId}/script`);
    },
  });

  const onInput = (key: keyof DraftForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  const jobsListHref = `/content/${encodeURIComponent(contentId)}/jobs`;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageBack href={jobsListHref} label="이 콘텐츠 잡 목록으로" />
        <AdminPageHeader
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                콘텐츠 관리
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <Link href={jobsListHref} className="hover:text-foreground">
                {content?.label ?? contentId}
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">새 잡</span>
            </div>
          }
          title="제작 잡 만들기"
          subtitle="선택한 콘텐츠(채널) 아래에 새 잡을 등록합니다. 생성 후 워크스페이스에서 스크립트·에셋·업로드를 이어갑니다."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시드 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!contentsQuery.isLoading && !content ? (
            <p className="text-sm text-destructive">
              이 contentId에 해당하는 콘텐츠를 찾을 수 없습니다.{' '}
              <Link href="/content" className="underline">
                목록으로
              </Link>
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 text-sm md:col-span-2">
              <p className="text-xs text-muted-foreground">콘텐츠</p>
              <p className="mt-1 font-medium">{content?.label ?? '…'}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{content?.contentId}</p>
            </div>
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
              <span className="font-medium">제목 아이디어</span>
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
              disabled={mutation.isPending || !content || !form.titleIdea.trim()}
              onClick={() =>
                mutation.mutate({
                  contentId,
                  targetLanguage: form.targetLanguage,
                  titleIdea: form.titleIdea.trim(),
                  targetDurationSec: Number(form.targetDurationSec),
                  stylePreset: form.stylePreset,
                  autoPublish: form.autoPublish,
                  publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
                })
              }
            >
              {mutation.isPending ? '생성 중…' : '잡 생성'}
            </Button>
            <Link
              href={jobsListHref}
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

export function CreateJobInContentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-3">
            <AdminPageBack href="/content" label="콘텐츠 목록으로" />
            <AdminPageHeader title="제작 잡 만들기" subtitle="불러오는 중…" />
          </div>
        </div>
      }
    >
      <CreateJobInContentContent />
    </Suspense>
  );
}
