'use client';

import { cn } from '@packages/ui';
import { Button } from '@packages/ui/button';
import { logout } from '@packages/auth';
import {
  Activity,
  Cog,
  Compass,
  ImagePlay,
  ListChecks,
  Settings,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function isUnderContentPath(pathname: string) {
  return pathname === '/content' || pathname.startsWith('/content/');
}

function isUnderJobsPath(pathname: string) {
  return pathname === '/jobs' || pathname === '/jobs/new' || pathname.startsWith('/jobs/');
}

function isUnderExecutionsPath(pathname: string) {
  return pathname === '/executions' || pathname.startsWith('/executions/');
}

function isDiscoveryPath(pathname: string) {
  return pathname === '/discovery' || pathname.startsWith('/discovery/');
}

export function DashboardSidebar() {
  const pathname = usePathname() ?? '/';

  const itemClass = (active: boolean) =>
    cn(
      'group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-all',
      active
        ? 'bg-[var(--admin-sidebar-active)] font-semibold text-white'
        : 'text-[var(--admin-sidebar-muted)] hover:bg-white/5 hover:text-white',
    );

  const itemAccentClass = (active: boolean) =>
    cn(
      'absolute inset-y-2 right-0 w-1 rounded-full bg-sidebar-primary transition-opacity',
      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
    );

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-r border-white/6 bg-admin-sidebar text-sidebar-foreground shadow-2xl shadow-slate-950/20 lg:flex">
      <div className="flex h-full w-full flex-col">
        <div className="border-b border-white/6 px-5 py-6">
          <Link href="/" className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-indigo-950/30">
              <Cog className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-admin-display truncate text-lg font-extrabold tracking-tight text-white">
                Automata Studio
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              제작
            </p>
            <Link href="/discovery" className={itemClass(isDiscoveryPath(pathname))}>
              <span className={itemAccentClass(isDiscoveryPath(pathname))} aria-hidden />
              <Compass className="size-4 shrink-0" />
              <span className="truncate uppercase tracking-wide">소재 탐색</span>
            </Link>
            <Link href="/jobs" className={itemClass(isUnderJobsPath(pathname))}>
              <span className={itemAccentClass(isUnderJobsPath(pathname))} aria-hidden />
              <ClipboardList className="size-4 shrink-0" />
              <span className="truncate uppercase tracking-wide">아이템</span>
            </Link>
            <Link href="/content" className={itemClass(isUnderContentPath(pathname))}>
              <span className={itemAccentClass(isUnderContentPath(pathname))} aria-hidden />
              <ImagePlay className="size-4 shrink-0" />
              <span className="truncate uppercase tracking-wide">채널</span>
            </Link>
          </div>

          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              운영
            </p>
            <Link
              href="/reviews"
              className={itemClass(pathname === '/reviews' || pathname.startsWith('/reviews/'))}
            >
              <span
                className={itemAccentClass(
                  pathname === '/reviews' || pathname.startsWith('/reviews/'),
                )}
                aria-hidden
              />
              <ListChecks className="size-4 shrink-0" />
              <span className="uppercase tracking-wide">검수함</span>
            </Link>
            <Link href="/executions" className={itemClass(isUnderExecutionsPath(pathname))}>
              <span className={itemAccentClass(isUnderExecutionsPath(pathname))} aria-hidden />
              <Activity className="size-4 shrink-0" />
              <span className="truncate uppercase tracking-wide">실행 현황</span>
            </Link>
          </div>

          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              설정
            </p>
            <Link
              href="/settings"
              className={itemClass(pathname === '/settings' || pathname.startsWith('/settings/'))}
            >
              <span
                className={itemAccentClass(
                  pathname === '/settings' || pathname.startsWith('/settings/'),
                )}
                aria-hidden
              />
              <Settings className="size-4 shrink-0" />
              <span className="uppercase tracking-wide">설정</span>
            </Link>
          </div>
        </nav>

        <div className="mt-auto border-t border-white/6 px-5 pb-5 pt-4">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                AU
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">Admin User</p>
                <p className="truncate text-[10px] text-slate-400">System Operator</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full border-slate-700 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardMobileBar() {
  const pathname = usePathname() ?? '/';

  const linkClass = (active: boolean) =>
    cn(
      'rounded-md px-2 py-1 transition-colors',
      active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-admin-surface-section hover:text-admin-primary',
    );

  return (
    <div className="rounded-2xl border border-admin-outline-ghost bg-[var(--admin-topbar)] p-4 shadow-sm backdrop-blur lg:hidden">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-primary">
        Console Navigation
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Link href="/" className={linkClass(pathname === '/')}>
          대시보드
        </Link>
        <Link href="/jobs" className={linkClass(isUnderJobsPath(pathname))}>
          아이템
        </Link>
        <Link href="/discovery" className={linkClass(isDiscoveryPath(pathname))}>
          소재
        </Link>
        <Link href="/content" className={linkClass(isUnderContentPath(pathname))}>
          채널
        </Link>
        <Link href="/reviews" className={linkClass(pathname.startsWith('/reviews'))}>
          검수함
        </Link>
        <Link href="/executions" className={linkClass(isUnderExecutionsPath(pathname))}>
          실행 현황
        </Link>
        <Link href="/settings" className={linkClass(pathname.startsWith('/settings'))}>
          설정
        </Link>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => logout()}>
        Logout
      </Button>
    </div>
  );
}
