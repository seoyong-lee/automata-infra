'use client';

import type { ReactNode } from 'react';

import { DashboardMobileBar, DashboardSidebar } from './dashboard-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-admin-surface-base">
      <DashboardSidebar />

      <section className="min-w-0 flex-1">
        <div className="flex w-full flex-col gap-6 px-4 py-6 md:px-8 xl:px-10">
          <DashboardMobileBar />
          {children}
        </div>
      </section>
    </main>
  );
}
