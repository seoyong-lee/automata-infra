'use client';

import type { ReactNode } from 'react';

import { AdminGlobalTopBar } from '@/shared/ui/admin-global-topbar';
import { DashboardMobileBar, DashboardMobileBottomNav, DashboardSidebar } from './dashboard-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-admin-surface-base">
      <DashboardSidebar />

      <section className="min-w-0 flex-1">
        <AdminGlobalTopBar />
        <div className="flex w-full flex-col gap-6 px-4 pb-28 pt-0 md:px-8 md:pt-24 lg:pb-6 xl:px-10">
          <DashboardMobileBar />
          {children}
        </div>
        <DashboardMobileBottomNav />
      </section>
    </main>
  );
}
