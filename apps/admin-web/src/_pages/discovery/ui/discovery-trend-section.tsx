'use client';

type TrendEnqueue = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: { enqueueTrendScoutJob: { message: string } } | null;
  mutate: (vars: { channelId?: string; dryRun?: boolean }) => void;
};

type Props = {
  channelId: string;
  trendDryRun: boolean;
  onTrendDryRunChange: (v: boolean) => void;
  enqueueTrendScout: TrendEnqueue;
};

export function DiscoveryTrendSection({
  channelId,
  trendDryRun,
  onTrendDryRunChange,
  enqueueTrendScout,
}: Props) {
  return (
    <section className="rounded-lg border border-border/80 bg-card p-4 text-sm shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">트렌드</h2>
      <p className="mt-2 text-muted-foreground">
        트렌드 스카우트는 외부 API 쿼터를 쓰므로 스케줄 없이 버튼으로 큐에 1건씩 넣어 실행합니다.
        후보 탭에서 라인을 고르면 URL의 채널이 설정되고, 그 스코프가 여기로 전달됩니다.
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
            onChange={(e) => onTrendDryRunChange(e.target.checked)}
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
    </section>
  );
}
