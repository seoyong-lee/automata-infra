'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import {
  useContentPublishDraftQuery,
  usePlatformConnectionsQuery,
  usePlatformPublishProfileQuery,
  useUpdateContentPublishDraftMutation,
} from '@packages/graphql';
import type { ContentPublishDraftGql } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

function parseMetadataJson(raw: string): Record<string, string | string[] | undefined> {
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === 'object' && v !== null
      ? (v as Record<string, string | string[] | undefined>)
      : {};
  } catch {
    return {};
  }
}

function gqlToDomainDraft(
  gql: ContentPublishDraftGql | null,
  jobId: string,
  fallbackTitle: string,
): Record<string, unknown> {
  if (!gql) {
    return {
      channelContentItemId: jobId,
      globalDraft: {
        title: fallbackTitle || undefined,
        caption: undefined,
        description: undefined,
        hashtags: [] as string[],
        thumbnailAssetId: undefined,
      },
      platformDrafts: [] as Array<Record<string, unknown>>,
    };
  }
  return {
    channelContentItemId: gql.channelContentItemId,
    globalDraft: {
      title: gql.globalDraft.title ?? undefined,
      caption: gql.globalDraft.caption ?? undefined,
      description: gql.globalDraft.description ?? undefined,
      hashtags: gql.globalDraft.hashtags ?? [],
      thumbnailAssetId: gql.globalDraft.thumbnailAssetId ?? undefined,
    },
    platformDrafts: gql.platformDrafts.map((p) => ({
      platform: p.platform,
      targetConnectionId: p.targetConnectionId,
      enabled: p.enabled,
      metadata: parseMetadataJson(p.metadataJson),
      overrideFields: p.overrideFields ?? [],
      validationStatus: p.validationStatus ?? undefined,
    })),
  };
}

type ContentPublishDraftSectionProps = {
  jobId: string;
  contentId?: string | null;
  fallbackTitle: string;
};

export function ContentPublishDraftSection({
  jobId,
  contentId,
  fallbackTitle,
}: ContentPublishDraftSectionProps) {
  const queryClient = useQueryClient();
  const channelOk =
    Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID && Boolean(contentId?.trim());

  const draftQuery = useContentPublishDraftQuery({ jobId }, { enabled: Boolean(jobId) });
  const connectionsQuery = usePlatformConnectionsQuery(
    { contentId: contentId ?? '' },
    { enabled: channelOk },
  );

  const firstConn = connectionsQuery.data?.[0];
  const profileQuery = usePlatformPublishProfileQuery(
    {
      channelId: contentId ?? '',
      platformConnectionId: firstConn?.platformConnectionId ?? '',
    },
    { enabled: channelOk && Boolean(firstConn?.platformConnectionId) },
  );

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [hashtagsRaw, setHashtagsRaw] = useState('');
  const [thumbnailAssetId, setThumbnailAssetId] = useState('');

  const baseDraft = useMemo(
    () => gqlToDomainDraft(draftQuery.data ?? null, jobId, fallbackTitle),
    [draftQuery.data, jobId, fallbackTitle],
  );

  useEffect(() => {
    const g = draftQuery.data?.globalDraft;
    setTitle(g?.title ?? fallbackTitle ?? '');
    setCaption(g?.caption ?? '');
    setDescription(g?.description ?? '');
    setHashtagsRaw((g?.hashtags ?? []).join(' '));
    setThumbnailAssetId(g?.thumbnailAssetId ?? '');
  }, [draftQuery.data, fallbackTitle]);

  const save = useUpdateContentPublishDraftMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contentPublishDraft', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['publishTargetsForJob', jobId] });
    },
  });

  const hashtags = hashtagsRaw
    .split(/[\s,#]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSave = () => {
    const hashtagsArr = hashtags;
    const merged: Record<string, unknown> = {
      ...baseDraft,
      globalDraft: {
        ...(baseDraft.globalDraft as Record<string, unknown>),
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
        description: description.trim() || undefined,
        hashtags: hashtagsArr,
        thumbnailAssetId: thumbnailAssetId.trim() || undefined,
      },
    };
    save.mutate({ draft: merged });
  };

  const previewProfile = profileQuery.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>채널·플랫폼 기본값 (미리보기)</CardTitle>
          <CardDescription>
            연결된 매체 계정과 게시 프로필의 일부입니다. 세부 정책은 채널의 &quot;매체
            연결&quot;·게시 프로필에서 다룹니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!channelOk ? (
            <p className="text-amber-600 dark:text-amber-500">
              채널이 연결된 뒤 기본값을 불러옵니다.
            </p>
          ) : connectionsQuery.isLoading ? (
            <p className="text-muted-foreground">연결 정보를 불러오는 중…</p>
          ) : (connectionsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">
              등록된 플랫폼 연결이 없습니다. 채널 상세의 &quot;매체 연결&quot;에서 계정을
              연결하세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {(connectionsQuery.data ?? []).map((c) => (
                <li
                  key={c.platformConnectionId}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <span className="font-medium">{c.platform}</span>{' '}
                  <span className="text-muted-foreground">
                    {c.accountHandle ?? c.accountId} · {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {previewProfile ? (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">선택 프로필 요약 (첫 연결)</p>
              <p>기본 해시태그: {(previewProfile.defaultHashtags ?? []).join(', ') || '—'}</p>
              <p>캡션 푸터: {previewProfile.captionFooterTemplate ?? '—'}</p>
              <p>기본 공개: {previewProfile.defaultVisibility ?? '—'}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>아이템별 발행 초안</CardTitle>
          <CardDescription>
            채널 기본값을 바탕으로 이 영상만의 제목·설명·태그를 조정합니다. 저장 시 서버에 초안이
            기록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {draftQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">초안을 불러오는 중…</p>
          ) : null}
          {!draftQuery.data ? (
            <p className="text-sm text-muted-foreground">
              아직 저장된 초안이 없습니다. 아래를 채우고 저장하면 새로 만듭니다.
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">제목</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">캡션</span>
            <textarea
              className="min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">설명</span>
            <textarea
              className="min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">해시태그 (공백·# 구분)</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={hashtagsRaw}
              onChange={(e) => setHashtagsRaw(e.target.value)}
              placeholder="#shorts #운세"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">썸네일 에셋 ID (선택)</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={thumbnailAssetId}
              onChange={(e) => setThumbnailAssetId(e.target.value)}
            />
          </label>

          {save.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(save.error)}</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" disabled={save.isPending || !jobId} onClick={handleSave}>
              {save.isPending ? '저장 중…' : '발행 초안 저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
