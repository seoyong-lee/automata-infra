'use client';

import type { ReactNode } from 'react';

const navigationItems = [
  { label: 'Overview', status: 'active' },
  { label: 'Content', status: 'planned' },
  { label: 'Jobs', status: 'planned' },
  { label: 'Reviews', status: 'planned' },
  { label: 'Settings', status: 'planned' },
] as const;

export function AdminV2AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f7fb_0%,#eef2f7_100%)] text-admin-text-strong">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-white/70 bg-[#0f172a] px-6 py-8 text-white lg:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Automata Studio
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Admin V2</h1>
            <p className="mt-2 text-sm leading-6 text-white/65">
              어수선했던 기존 운영 화면을 새 정보 구조로 다시 쌓기 위한 별도 워크스페이스입니다.
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            {navigationItems.map((item) => {
              const isActive = item.status === 'active';

              return (
                <div
                  key={item.label}
                  className={
                    isActive
                      ? 'rounded-xl bg-white px-4 py-3 text-slate-950'
                      : 'rounded-xl border border-white/10 px-4 py-3 text-white/72'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-current/60">
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto pt-10">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                Status
              </p>
              <p className="mt-2 text-sm font-medium">Scaffold only</p>
              <p className="mt-1 text-sm leading-6 text-white/65">
                실제 기능 연결 전까지는 레이아웃, 공용 컴포넌트, 라우트 기준만 다듬습니다.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-admin-text-muted">
                  Rebuild
                </p>
                <p className="mt-1 text-base font-semibold text-admin-text-strong">
                  Admin shell and temporary home
                </p>
              </div>
              <div className="rounded-full border border-admin-outline-ghost bg-white px-3 py-1 text-xs font-medium text-admin-text-muted">
                `apps/admin-v2`
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
