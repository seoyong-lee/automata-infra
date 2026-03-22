'use client';

import { cn } from '@packages/ui';
import { Button } from '@packages/ui/button';
import { logout } from '@packages/auth';
import {
  Activity,
  Cog,
  Compass,
  ImagePlay,
  LayoutDashboard,
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

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-full w-full flex-col">
        <div className="border-b px-4 py-4">
          <Link href="/" className="flex items-center gap-3 rounded-md p-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Cog className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Automata Studio</p>
              <p className="truncate text-xs text-muted-foreground">Admin Console</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              pathname === '/'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span>대시보드</span>
          </Link>

          <Link
            href="/discovery"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              isDiscoveryPath(pathname)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Compass className="size-4 shrink-0" />
            <span className="truncate">벤치마크</span>
          </Link>

          <Link
            href="/content"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              isUnderContentPath(pathname)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <ImagePlay className="size-4 shrink-0" />
            <span className="truncate">채널</span>
          </Link>

          <Link
            href="/jobs"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              isUnderJobsPath(pathname)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <ClipboardList className="size-4 shrink-0" />
            <span className="truncate">제작 아이템</span>
          </Link>

          <Link
            href="/executions"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              isUnderExecutionsPath(pathname)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Activity className="size-4 shrink-0" />
            <span className="truncate">실행 현황</span>
          </Link>

          <Link
            href="/reviews"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              pathname === '/reviews' || pathname.startsWith('/reviews/')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <ListChecks className="size-4 shrink-0" />
            <span>리뷰 큐</span>
          </Link>

          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Settings className="size-4 shrink-0" />
            <span>설정</span>
          </Link>
        </nav>

        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            Logout
          </Button>
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
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-primary',
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 lg:hidden">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Link href="/" className={linkClass(pathname === '/')}>
          대시보드
        </Link>
        <Link href="/content" className={linkClass(isUnderContentPath(pathname))}>
          채널
        </Link>
        <Link href="/discovery" className={linkClass(isDiscoveryPath(pathname))}>
          발굴
        </Link>
        <Link href="/jobs" className={linkClass(isUnderJobsPath(pathname))}>
          제작 아이템
        </Link>
        <Link href="/executions" className={linkClass(isUnderExecutionsPath(pathname))}>
          실행 현황
        </Link>
        <Link href="/reviews" className={linkClass(pathname.startsWith('/reviews'))}>
          리뷰 큐
        </Link>
        <Link href="/settings" className={linkClass(pathname.startsWith('/settings'))}>
          설정
        </Link>
      </div>
      <Button variant="outline" size="sm" onClick={() => logout()}>
        Logout
      </Button>
    </div>
  );
}
