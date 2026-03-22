'use client';

import { Suspense } from 'react';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { useDiscoveryPage } from '../model/discovery-page-state';
import { DiscoveryPageShell } from './discovery-page-shell';

function DiscoveryPageBody() {
  const ctx = useDiscoveryPage();
  return <DiscoveryPageShell {...ctx} />;
}

export function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="소재 찾기" subtitle="불러오는 중…" />
        </div>
      }
    >
      <DiscoveryPageBody />
    </Suspense>
  );
}
