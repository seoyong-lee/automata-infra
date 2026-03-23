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
  ClipboardList,
  Workflow,
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

  const workflowItems = [
    {
      href: '/discovery',
      label: '소재 탐색',
      step: '01',
      icon: Compass,
      active: isDiscoveryPath(pathname),
    },
    {
      href: '/jobs',
      label: '아이템 작업',
      step: '02',
      icon: ClipboardList,
      active: isUnderJobsPath(pathname),
    },
    {
      href: '/content',
      label: '채널 편성',
      step: '03',
      icon: ImagePlay,
      active: isUnderContentPath(pathname),
    },
    {
      href: '/reviews',
      label: '검수',
      step: '04',
      icon: ListChecks,
      active: pathname === '/reviews' || pathname.startsWith('/reviews/'),
    },
    {
      href: '/executions',
      label: '실행 모니터링',
      step: '05',
      icon: Activity,
      active: isUnderExecutionsPath(pathname),
    },
  ] as const;

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
              Workflow
            </p>
            {workflowItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={itemClass(item.active)}>
                  <span className={itemAccentClass(item.active)} aria-hidden />
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-[10px] font-semibold tracking-[0.22em] text-slate-500/90">
                      {item.step}
                    </span>
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate tracking-wide">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Workspace
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
              <Workflow className="size-4 shrink-0" />
              <span className="tracking-wide">설정 워크스페이스</span>
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
    <div className="rounded-2xl border border-admin-outline-ghost bg-admin-topbar p-4 shadow-sm backdrop-blur lg:hidden">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-primary">
        Workflow Steps
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Link href="/discovery" className={linkClass(isDiscoveryPath(pathname))}>
          소재 탐색
        </Link>
        <Link href="/jobs" className={linkClass(isUnderJobsPath(pathname))}>
          아이템 작업
        </Link>
        <Link href="/content" className={linkClass(isUnderContentPath(pathname))}>
          채널 편성
        </Link>
        <Link href="/reviews" className={linkClass(pathname.startsWith('/reviews'))}>
          검수
        </Link>
        <Link href="/executions" className={linkClass(isUnderExecutionsPath(pathname))}>
          실행 모니터링
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
