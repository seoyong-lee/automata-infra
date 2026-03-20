'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, Suspense, useEffect, useState } from 'react';
import { useCreateDraftJob } from '@/entities/admin-job';

type DraftForm = {
  channelId: string;
  targetLanguage: string;
  contentType: string;
  variant: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
  autoPublish: boolean;
  publishAt: string;
};

const CreateContentJobContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<DraftForm>({
    channelId: 'saju-shorts-ko',
    targetLanguage: 'ko',
    contentType: 'daily-total',
    variant: 'v1',
    titleIdea: '',
    targetDurationSec: '45',
    stylePreset: 'mystic_daily_short',
    autoPublish: false,
    publishAt: '',
  });

  useEffect(() => {
    const channelId = searchParams.get('channelId');
    const contentType = searchParams.get('contentType');
    setForm((current) => ({
      ...current,
      channelId: channelId ?? current.channelId,
      contentType: contentType ?? current.contentType,
    }));
  }, [searchParams]);

  const mutation = useCreateDraftJob({
    onSuccess: ({ createDraftJob }) => {
      router.push(`/jobs/${createDraftJob.jobId}`);
    },
  });

  const onInput = (key: keyof DraftForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="hover:text-primary"
              onClick={() => router.push('/jobs')}
            >
              콘텐츠 관리
            </button>
            <span>/</span>
            <span>{form.channelId || 'channel'}</span>
            <span>/</span>
            <span>{form.contentType || 'content-line'}</span>
          </div>
          <CardTitle>Create Content Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            선택한 유튜브 채널과 콘텐츠 라인 안에서 새 잡을 생성합니다. 생성 후 deep workspace로
            이동해 스크립트, scene JSON, 에셋, 업로드를 이어서 관리합니다.
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Current Channel</p>
              <p className="mt-1 font-medium">{form.channelId || '-'}</p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Content Line</p>
              <p className="mt-1 font-medium">{form.contentType || '-'}</p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Return Flow</p>
              <p className="mt-1 font-medium">{'Content line -> selected job'}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Channel ID</span>
              <Input value={form.channelId} onChange={onInput('channelId')} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Target Language</span>
              <Input value={form.targetLanguage} onChange={onInput('targetLanguage')} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Content Type</span>
              <Input value={form.contentType} onChange={onInput('contentType')} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Variant</span>
              <Input value={form.variant} onChange={onInput('variant')} />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Title Idea</span>
              <Input value={form.titleIdea} onChange={onInput('titleIdea')} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Target Duration Sec</span>
              <Input
                type="number"
                value={form.targetDurationSec}
                onChange={onInput('targetDurationSec')}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Style Preset</span>
              <Input value={form.stylePreset} onChange={onInput('stylePreset')} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Publish At (optional)</span>
              <Input type="datetime-local" value={form.publishAt} onChange={onInput('publishAt')} />
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input type="checkbox" checked={form.autoPublish} onChange={onInput('autoPublish')} />
              <span className="font-medium">Auto publish after render</span>
            </label>
          </div>
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                channelId: form.channelId,
                targetLanguage: form.targetLanguage,
                contentType: form.contentType,
                variant: form.variant,
                titleIdea: form.titleIdea,
                targetDurationSec: Number(form.targetDurationSec),
                stylePreset: form.stylePreset,
                autoPublish: form.autoPublish,
                publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
              })
            }
          >
            {mutation.isPending ? 'Creating...' : 'Create Content Job'}
          </Button>
          {mutation.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export function CreateContentJobPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Content Job</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading content form...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CreateContentJobContent />
    </Suspense>
  );
}
