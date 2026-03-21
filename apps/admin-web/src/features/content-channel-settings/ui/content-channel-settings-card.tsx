'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import type { AdminContent } from '@packages/graphql';
import { useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

import { useUpdateContent } from '@/entities/admin-content';

import { toContentChannelForm } from '../lib/toContentChannelForm';
import { type ContentChannelForm } from '../model/form';

const createInputHandler =
  (setForm: Dispatch<SetStateAction<ContentChannelForm>>) =>
  (key: keyof ContentChannelForm) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({
      ...current,
      [key]:
        event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
          ? event.target.checked
          : event.target.value,
    }));
  };

type Props = {
  content: AdminContent;
};

export function ContentChannelSettingsCard({ content }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContentChannelForm>(() => toContentChannelForm(content));

  const update = useUpdateContent({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminContents'] });
    },
  });

  useEffect(() => {
    setForm(toContentChannelForm(content));
  }, [content]);

  const onInput = createInputHandler(setForm);

  const onSave = () => {
    update.mutate({
      contentId: content.contentId,
      label: form.label.trim(),
      youtubeSecretName: form.youtubeSecretName.trim() || undefined,
      youtubeAccountType: form.youtubeAccountType.trim() || undefined,
      autoPublishEnabled: form.autoPublishEnabled,
      defaultVisibility: form.defaultVisibility,
      defaultCategoryId: form.defaultCategoryId.trim() ? Number(form.defaultCategoryId) : undefined,
      playlistId: form.playlistId.trim() || undefined,
    });
  };

  const onClearYoutube = () => {
    if (
      !window.confirm(
        '이 채널에 저장된 유튜브 게시 설정(시크릿·가시성·플레이리스트 등)을 모두 지울까요?',
      )
    ) {
      return;
    }
    update.mutate({ contentId: content.contentId, clearYoutubePublish: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{content.label}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono">{content.contentId}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">표시 이름</span>
            <Input value={form.label} onChange={onInput('label')} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">YouTube OAuth 시크릿 이름</span>
            <Input value={form.youtubeSecretName} onChange={onInput('youtubeSecretName')} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Account type</span>
            <Input value={form.youtubeAccountType} onChange={onInput('youtubeAccountType')} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">기본 공개 범위</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.defaultVisibility}
              onChange={onInput('defaultVisibility')}
            >
              <option value="private">private</option>
              <option value="unlisted">unlisted</option>
              <option value="public">public</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">카테고리 ID</span>
            <Input
              type="number"
              value={form.defaultCategoryId}
              onChange={onInput('defaultCategoryId')}
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Playlist ID</span>
            <Input value={form.playlistId} onChange={onInput('playlistId')} />
          </label>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.autoPublishEnabled}
              onChange={onInput('autoPublishEnabled')}
            />
            <span className="font-medium">렌더 후 자동 게시</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          마지막 반영: {content.youtubeUpdatedAt ?? content.updatedAt ?? '—'} ·{' '}
          {content.youtubeUpdatedBy ?? '—'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={update.isPending}
            onClick={onSave}
          >
            {update.isPending ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm disabled:opacity-50"
            disabled={update.isPending}
            onClick={onClearYoutube}
          >
            유튜브 설정만 지우기
          </button>
        </div>
        {update.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(update.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
