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
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  Settings2,
  Menu,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminLocaleSwitcher } from '@/shared/ui/admin-locale-switcher';

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
  const dashboardActive = pathname === '/';
  const t = useTranslations('nav.sidebar');

  const workflowItems = [
    {
      href: '/discovery',
      label: t('discovery'),
      step: '01',
      icon: Compass,
      active: isDiscoveryPath(pathname),
    },
    {
      href: '/jobs',
      label: t('jobs'),
      step: '02',
      icon: ClipboardList,
      active: isUnderJobsPath(pathname),
    },
    {
      href: '/content',
      label: t('content'),
      step: '03',
      icon: ImagePlay,
      active: isUnderContentPath(pathname),
    },
    {
      href: '/reviews',
      label: t('reviews'),
      step: '04',
      icon: ListChecks,
      active: pathname === '/reviews' || pathname.startsWith('/reviews/'),
    },
    {
      href: '/executions',
      label: t('executions'),
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
                {t('adminConsole')}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t('overview')}
            </p>
            <Link href="/" className={itemClass(dashboardActive)}>
              <span className={itemAccentClass(dashboardActive)} aria-hidden />
              <div className="flex min-w-0 items-center gap-3">
                <LayoutDashboard className="size-4 shrink-0" />
                <span className="truncate tracking-wide">{t('dashboard')}</span>
              </div>
            </Link>
          </div>

          <div className="space-y-1">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t('workflow')}
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
              {t('workspace')}
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
              <span className="tracking-wide">{t('settingsWorkspace')}</span>
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
                <p className="truncate text-xs font-semibold text-white">{t('adminUser')}</p>
                <p className="truncate text-[10px] text-slate-400">{t('systemOperator')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full border-slate-700 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white"
              onClick={() => logout()}
            >
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardMobileBar() {
  const t = useTranslations('nav.sidebar');

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-admin-primary transition-colors hover:bg-slate-200/60"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="font-admin-display truncate text-lg font-extrabold tracking-tight text-admin-primary">
              {t('mobileTitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AdminLocaleSwitcher />
          <p className="hidden text-sm font-semibold text-admin-primary sm:block">
            {t('adminProfile')}
          </p>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full bg-admin-primary-container/35 text-admin-primary"
          >
            AU
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardMobileBottomNav() {
  const pathname = usePathname() ?? '/';
  const t = useTranslations('nav.sidebar');

  const items = [
    {
      href: '/',
      label: t('bottomOverview'),
      active: pathname === '/',
      Icon: LayoutDashboard,
    },
    {
      href: '/jobs',
      label: t('bottomJobs'),
      active: isUnderJobsPath(pathname),
      Icon: BriefcaseBusiness,
    },
    {
      href: '/content',
      label: t('bottomContent'),
      active: isUnderContentPath(pathname),
      Icon: FileText,
    },
    {
      href: '/reviews',
      label: t('bottomReviews'),
      active: pathname === '/reviews' || pathname.startsWith('/reviews/'),
      Icon: ListChecks,
    },
    {
      href: '/settings',
      label: t('bottomSettings'),
      active: pathname === '/settings' || pathname.startsWith('/settings/'),
      Icon: Settings2,
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] lg:hidden">
      <div className="flex items-center justify-around gap-1">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-200 ease-out active:scale-90',
                item.active
                  ? 'bg-admin-surface-section text-admin-primary'
                  : 'text-slate-400 hover:text-admin-primary',
              )}
            >
              <Icon className="size-4" />
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.05em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
