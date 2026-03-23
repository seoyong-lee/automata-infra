'use client';

import { Bell, CircleHelp, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminLocaleSwitcher } from './admin-locale-switcher';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminGlobalTopBar() {
  const pathname = usePathname() ?? '/';
  const t = useTranslations('nav.topTabs');
  const common = useTranslations('common');
  const topTabs = [
    { href: '/jobs', label: t('workQueue') },
    { href: '/reviews', label: t('reviewBacklog') },
    { href: '/executions', label: t('runHealth') },
    { href: '/settings', label: t('costLimits') },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 hidden border-b border-slate-200/60 bg-white/80 backdrop-blur-md md:block lg:left-72">
      <div className="flex h-16 items-center justify-between gap-6 px-4 md:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-8">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-64 rounded-full border-none bg-admin-surface-section px-10 pr-4 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:ring-1 focus:ring-admin-primary"
              placeholder={common('searchWorkspacePlaceholder')}
              type="text"
            />
          </div>
          <nav className="hidden items-center gap-6 lg:flex">
            {topTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  isActive(pathname, tab.href)
                    ? 'border-b-2 border-admin-primary py-5 text-sm font-medium text-admin-primary'
                    : 'py-5 text-sm font-medium text-slate-500 transition-colors hover:text-admin-primary'
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <AdminLocaleSwitcher className="hidden md:inline-flex" />
          <button className="flex size-10 items-center justify-center text-slate-500 transition-colors hover:text-admin-primary">
            <Bell className="size-4" />
          </button>
          <button className="flex size-10 items-center justify-center text-slate-500 transition-colors hover:text-admin-primary">
            <CircleHelp className="size-4" />
          </button>
          <div className="mx-1 hidden h-8 w-px bg-slate-200 md:block" />
          <div className="flex size-8 items-center justify-center rounded-lg bg-admin-primary-container/35 text-[10px] font-bold text-admin-primary">
            AU
          </div>
        </div>
      </div>
    </header>
  );
}
