'use client';

import { useEnqueueTrendScoutJobMutation } from '@packages/graphql';
import { cn } from '@packages/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { CreateSourceItemDialog } from '@/widgets/create-source-item';
import { HitChannelsPanel } from '@/widgets/hit-channels';
import { IdeaCandidatesPanel } from '@/widgets/idea-candidates';
import { SavedSourcesPanel } from '@/widgets/saved-sources';
import { useAdminContents } from '@/entities/admin-content';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const TAB_IDS = ['explore', 'watchlist', 'candidates', 'trends', 'sources'] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

function DiscoveryPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel')?.trim() ?? '';
  const tabRaw = searchParams.get('tab');
  const tab: TabId = isTabId(tabRaw) ? tabRaw : 'explore';

  const contentsQuery = useAdminContents({ limit: 100 });
  const items = contentsQuery.data?.items ?? [];
  const queryClient = useQueryClient();
  const createFromUrl = searchParams.get('create') === '1';
  const [createOpenManual, setCreateOpenManual] = useState(false);
  const createSourceOpen = createFromUrl || createOpenManual;
  const [trendDryRun, setTrendDryRun] = useState(false);

  const closeCreateSource = () => {
    setCreateOpenManual(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('create');
    const q = params.toString();
    router.replace(q ? `/discovery?${q}` : '/discovery');
  };
  const enqueueTrendScout = useEnqueueTrendScoutJobMutation({
    onSuccess: () => {
      if (channelId) {
        void queryClient.invalidateQueries({
          queryKey: ['agentRunsForChannel', channelId],
        });
      }
    },
  });

  const setQuery = (next: { channel?: string; tab?: TabId }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.channel !== undefined) {
      if (next.channel) {
        params.set('channel', next.channel);
      } else {
        params.delete('channel');
      }
    }
    if (next.tab !== undefined) {
      params.set('tab', next.tab);
    }
    const q = params.toString();
    router.replace(q ? `/discovery?${q}` : '/discovery');
  };

  const onChannelChange = (nextId: string) => {
    setQuery({ channel: nextId });
  };

  const onTabChange = (nextTab: TabId) => {
    setQuery({ tab: nextTab });
  };

  const tabDefs: { id: TabId; label: string }[] = [
    { id: 'explore', label: '외부 채널 탐색' },
    { id: 'watchlist', label: '히트·워치리스트' },
    { id: 'candidates', label: '자동 발굴 후보' },
    { id: 'trends', label: '트렌드 신호' },
    { id: 'sources', label: '저장한 소재' },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="소재 발굴"
        subtitle="외부 채널·후보·워치리스트·트렌드 신호를 한 워크스페이스에서 다룹니다. 운영 라인을 고르면 그 관점에서 필터링됩니다. 실제 파이프라인 실행은 「제작 아이템」에서 이어갑니다."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <label htmlFor="discovery-channel" className="text-sm font-medium text-foreground">
          운영 라인 (선택·필터)
        </label>
        <select
          id="discovery-channel"
          className="max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={channelId}
          onChange={(e) => onChannelChange(e.target.value)}
          disabled={contentsQuery.isLoading}
        >
          <option value="">전역만 (탭별 안내)</option>
          {items.map((c) => (
            <option key={c.contentId} value={c.contentId}>
              {c.label || c.contentId}
            </option>
          ))}
        </select>
        {channelId ? (
          <Link
            href={`/content/${encodeURIComponent(channelId)}/jobs`}
            className="text-sm text-primary hover:underline"
          >
            이 라인의 제작 아이템 →
          </Link>
        ) : null}
      </div>

      <div className="border-b border-border">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="소재 발굴 구역">
          {tabDefs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cn(
                'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'border border-b-0 border-border bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6" role="tabpanel">
        {tab === 'explore' ? (
          <section className="rounded-lg border border-border/80 bg-card p-4 text-sm shadow-sm">
            <h2 className="text-sm font-semibold tracking-tight">외부 채널 탐색</h2>
            <p className="mt-2 text-muted-foreground">
              YouTube 등 외부 채널 ID를 알면{' '}
              <strong className="text-foreground">히트·워치리스트</strong> 탭에서 추가해 참고용
              라이브러리로 쌓습니다. 검색·자동 발견 API는 이후 연결합니다.
            </p>
            <p className="mt-3 text-muted-foreground">
              워치리스트 저장은 스토어상 <strong className="text-foreground">운영 라인</strong>에
              연결됩니다. 라인을 고른 뒤 워치리스트 탭에서 ID를 추가하면 그 라인 기준으로
              추적합니다.
            </p>
          </section>
        ) : null}

        {tab === 'watchlist' ? (
          channelId ? (
            <HitChannelsPanel channelId={channelId} />
          ) : (
            <p className="text-sm text-muted-foreground">
              워치리스트에 추가·평가를 붙이려면 위에서{' '}
              <strong className="text-foreground">운영 라인</strong>을 선택하세요. (데이터는
              라인별로 구분됩니다.)
            </p>
          )
        ) : null}

        {tab === 'candidates' ? (
          channelId ? (
            <IdeaCandidatesPanel channelId={channelId} />
          ) : (
            <p className="text-sm text-muted-foreground">
              자동 발굴 후보는 <strong className="text-foreground">운영 라인</strong>별로
              제안됩니다. 라인을 선택하면 목록을 불러옵니다.
            </p>
          )
        ) : null}

        {tab === 'trends' ? (
          <section className="rounded-lg border border-border/80 bg-card p-4 text-sm shadow-sm">
            <h2 className="text-sm font-semibold tracking-tight">트렌드 신호</h2>
            <p className="mt-2 text-muted-foreground">
              트렌드 스카우트는 YouTube 등 외부 API 쿼터를 쓰므로{' '}
              <strong className="text-foreground">스케줄 없이</strong>, 아래 버튼으로만 큐에 1건씩
              넣어 실행합니다. 운영 라인을 고르면 해당 라인(
              <code className="rounded bg-muted px-1 py-0.5 text-xs">contentId</code>) 스코프로
              메시지가 전달됩니다.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                disabled={enqueueTrendScout.isPending}
                onClick={() =>
                  enqueueTrendScout.mutate({
                    channelId: channelId || undefined,
                    dryRun: trendDryRun || undefined,
                  })
                }
              >
                {enqueueTrendScout.isPending ? '큐에 넣는 중…' : '트렌드 스카우트 실행 (큐 1건)'}
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={trendDryRun}
                  onChange={(e) => setTrendDryRun(e.target.checked)}
                />
                드라이런(스토어 미기록·에이전트 노트만)
              </label>
            </div>
            {enqueueTrendScout.isError ? (
              <p className="mt-3 text-xs text-destructive">
                요청에 실패했습니다. 네트워크·권한·큐 설정을 확인하세요.
              </p>
            ) : null}
            {enqueueTrendScout.isSuccess && enqueueTrendScout.data ? (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                {enqueueTrendScout.data.enqueueTrendScoutJob.message}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-muted-foreground">
              수집·목록 UI는 이후 연결합니다. 에이전트 실행 이력은{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">agentRunsForChannel</code>{' '}
              등으로 조회할 수 있습니다.
            </p>
          </section>
        ) : null}

        {tab === 'sources' ? (
          <SavedSourcesPanel
            channelFilter={channelId}
            onCreateClick={() => setCreateOpenManual(true)}
          />
        ) : null}
      </div>

      <CreateSourceItemDialog
        open={createSourceOpen}
        onClose={closeCreateSource}
        channels={items}
      />
    </div>
  );
}

export function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="소재 발굴" subtitle="불러오는 중…" />
        </div>
      }
    >
      <DiscoveryPageBody />
    </Suspense>
  );
}
