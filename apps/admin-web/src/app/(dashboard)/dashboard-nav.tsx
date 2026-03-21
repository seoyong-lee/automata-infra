'use client';

import { cn } from '@packages/ui';
import { Button } from '@packages/ui/button';
import { logout } from '@packages/auth';
import {
  ChevronDown,
  ChevronRight,
  Cog,
  FilePlay,
  LayoutDashboard,
  Route,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const contentSubItems = [
  { title: '콘텐츠 목록', href: '/content', match: (p: string) => p === '/content' },
  {
    title: '새 콘텐츠',
    href: '/content/new',
    match: (p: string) => p === '/content/new',
  },
] as const;

/** 콘텐츠 카탈로그·하위 경로와 잡 워크스페이스(`/jobs/…`)를 같은 영역으로 묶는다. */
function isUnderContentPath(pathname: string) {
  return (
    pathname === '/content' || pathname.startsWith('/content/') || pathname.startsWith('/jobs/')
  );
}

export function DashboardSidebar() {
  const pathname = usePathname() ?? '/';
  const [contentExpanded, setContentExpanded] = useState(() => isUnderContentPath(pathname));

  useEffect(() => {
    if (isUnderContentPath(pathname)) {
      setContentExpanded(true);
    }
  }, [pathname]);

  const contentGroupActive = isUnderContentPath(pathname);

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

          <div className="space-y-1">
            <div
              className={cn(
                'flex items-stretch gap-0.5 rounded-md',
                contentGroupActive ? 'bg-sidebar-accent/80' : '',
              )}
            >
              <Link
                href="/content"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
                  contentGroupActive
                    ? 'text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <FilePlay className="size-4 shrink-0" />
                <span className="truncate">콘텐츠 관리</span>
              </Link>
              <button
                type="button"
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  contentGroupActive ? 'text-sidebar-accent-foreground' : '',
                )}
                aria-expanded={contentExpanded}
                aria-label={contentExpanded ? '콘텐츠 하위 메뉴 접기' : '콘텐츠 하위 메뉴 펼치기'}
                onClick={() => setContentExpanded((open) => !open)}
              >
                {contentExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            </div>

            {contentExpanded ? (
              <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-3">
                {contentSubItems.map((item) => {
                  const subActive = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex rounded-md px-3 py-2 text-sm transition-colors',
                        subActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                      )}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <Link
            href="/reviews"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors',
              pathname === '/reviews' || pathname.startsWith('/reviews/')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Route className="size-4 shrink-0" />
            <span>작업 현황</span>
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
  const [contentExpanded, setContentExpanded] = useState(() => isUnderContentPath(pathname));

  useEffect(() => {
    if (isUnderContentPath(pathname)) {
      setContentExpanded(true);
    }
  }, [pathname]);

  const linkClass = (active: boolean) =>
    cn(
      'rounded-md px-2 py-1 transition-colors',
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-primary',
    );

  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href="/" className={linkClass(pathname === '/')}>
            대시보드
          </Link>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-primary',
              isUnderContentPath(pathname) ? 'bg-accent text-accent-foreground' : '',
            )}
            aria-expanded={contentExpanded}
            onClick={() => setContentExpanded((v) => !v)}
          >
            콘텐츠
            {contentExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
          <Link href="/reviews" className={linkClass(pathname.startsWith('/reviews'))}>
            작업 현황
          </Link>
          <Link href="/settings" className={linkClass(pathname.startsWith('/settings'))}>
            설정
          </Link>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Logout
        </Button>
      </div>
      {contentExpanded ? (
        <div className="flex flex-wrap gap-2 border-l-2 border-border pl-3 text-sm">
          <Link href="/content" className={linkClass(pathname === '/content')}>
            콘텐츠 목록
          </Link>
          <Link href="/content/new" className={linkClass(pathname === '/content/new')}>
            새 콘텐츠
          </Link>
        </div>
      ) : null}
    </div>
  );
}
