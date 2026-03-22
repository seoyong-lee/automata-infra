'use client';

type Props = {
  channelProbe: string;
  onChannelProbeChange: (v: string) => void;
  onGoShortlist: () => void;
};

export function DiscoveryChannelFindSection({
  channelProbe,
  onChannelProbeChange,
  onGoShortlist,
}: Props) {
  return (
    <section className="rounded-lg border border-border/80 bg-card p-4 text-sm shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">채널 찾기</h2>
      <p className="mt-2 text-muted-foreground">
        참고할 외부 YouTube 채널 ID를 적어 두었다가, 아래 버튼으로「후보」탭에서 운영 라인을 고른 뒤
        관심 채널에 추가하세요.
      </p>
      <div className="mt-4 flex max-w-lg flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="probe-ch">
          YouTube externalChannelId (메모)
        </label>
        <input
          id="probe-ch"
          type="text"
          value={channelProbe}
          onChange={(e) => onChannelProbeChange(e.target.value)}
          placeholder="예: UCxxxxxxxx"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        <button
          type="button"
          className="mt-1 w-fit rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          onClick={onGoShortlist}
        >
          후보 탭에서 관심 채널에 추가하기 →
        </button>
      </div>
    </section>
  );
}
