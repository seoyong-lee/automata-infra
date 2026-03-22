'use client';

import type { PublishPlatform, PlatformConnectionStatus } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import {
  usePlatformConnectionsQuery,
  useUpsertPlatformConnectionMutation,
} from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { ContentChannelSubnav } from '@/widgets/content-channel';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const PLATFORMS: PublishPlatform[] = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];

function ChannelConnectionsPageBody() {
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const queryClient = useQueryClient();
  const contentsQuery = useAdminContents({ limit: 200 });
  const label = useMemo(() => {
    return contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label;
  }, [contentsQuery.data?.items, contentId]);

  const listQuery = usePlatformConnectionsQuery({ contentId }, { enabled: Boolean(contentId) });

  const upsert = useUpsertPlatformConnectionMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platformConnections', contentId] });
    },
  });

  const [platform, setPlatform] = useState<PublishPlatform>('YOUTUBE');
  const [accountId, setAccountId] = useState('');
  const [oauthAccountId, setOauthAccountId] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [status, setStatus] = useState<PlatformConnectionStatus>('CONNECTED');

  const submit = () => {
    if (!contentId.trim() || !accountId.trim() || !oauthAccountId.trim()) return;
    upsert.mutate({
      channelId: contentId,
      platform,
      accountId: accountId.trim(),
      oauthAccountId: oauthAccountId.trim(),
      accountHandle: accountHandle.trim() || undefined,
      status,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref="/content"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                채널
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">{(label ?? contentId) || '—'}</span>
            </div>
          }
          title="매체 연결"
          subtitle="이 채널이 어떤 외부 계정으로 배포되는지 정의합니다. OAuth 연동은 추후 연결하고, 여기서는 계정 식별자를 수동으로 등록·갱신할 수 있습니다."
        />
      </div>

      <ContentChannelSubnav contentId={contentId} />

      <Card>
        <CardHeader>
          <CardTitle>연결 목록</CardTitle>
          <CardDescription>
            YouTube·TikTok·Instagram 계정 카드입니다. 합성(synthetic) 연결과 저장소에 등록된 연결이
            함께 보일 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : (listQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 연결이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {(listQuery.data ?? []).map((c) => (
                <li
                  key={`${c.platform}-${c.platformConnectionId}`}
                  className="rounded-lg border border-border p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{c.platform}</span>
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    @{c.accountHandle ?? c.accountId} · oauth {c.oauthAccountId}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {c.platformConnectionId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    마지막 동기 {c.lastSyncedAt ?? c.connectedAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>연결 추가·갱신</CardTitle>
          <CardDescription>
            동일 플랫폼에 여러 계정이 있으면 새 UUID로 연결이 생깁니다. 기존 ID를 알고 있으면 추후
            편집 API로 이어 붙일 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">플랫폼</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PublishPlatform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">accountId (채널/페이지 ID 등)</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">oauthAccountId</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={oauthAccountId}
              onChange={(e) => setOauthAccountId(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">표시 핸들 (선택)</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">상태</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlatformConnectionStatus)}
            >
              <option value="CONNECTED">CONNECTED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="ERROR">ERROR</option>
              <option value="DISCONNECTED">DISCONNECTED</option>
            </select>
          </label>
          {upsert.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(upsert.error)}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAccountId('');
              setOauthAccountId('');
              setAccountHandle('');
            }}
          >
            입력란 비우기
          </Button>
          <div className="flex justify-end">
            <Button type="button" disabled={upsert.isPending || !contentId} onClick={submit}>
              {upsert.isPending ? '저장 중…' : '연결 저장 (upsert)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ChannelConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageBack href="/content" label="채널 목록으로" />
          <AdminPageHeader title="매체 연결" subtitle="불러오는 중…" />
        </div>
      }
    >
      <ChannelConnectionsPageBody />
    </Suspense>
  );
}
