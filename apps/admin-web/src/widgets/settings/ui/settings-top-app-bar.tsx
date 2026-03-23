'use client';

import { Bell, CircleHelp, Server } from 'lucide-react';
import Link from 'next/link';

const topTabs = [
  { href: '/jobs', label: 'Items' },
  { href: '/reviews', label: 'Queue' },
  { href: '/executions', label: 'Schedule' },
  { href: '/settings', label: 'Connections' },
];

export function SettingsTopAppBar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 hidden border-b border-slate-200/60 bg-white/80 backdrop-blur-md md:block lg:left-72">
      <div className="flex h-16 items-center justify-between gap-6 px-4 md:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900">Settings</h2>
          <div className="hidden h-6 w-px bg-slate-200 lg:block" />
          <nav className="hidden items-center gap-6 lg:flex">
            {topTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-admin-primary"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="flex size-10 items-center justify-center text-slate-500 transition-colors hover:text-admin-primary">
            <Bell className="size-4" />
          </button>
          <button className="flex size-10 items-center justify-center text-slate-500 transition-colors hover:text-admin-primary">
            <Server className="size-4" />
          </button>
          <button className="flex size-10 items-center justify-center text-slate-500 transition-colors hover:text-admin-primary">
            <CircleHelp className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
