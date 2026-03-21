'use client';

import { usePathname } from 'next/navigation';

import { AdminBreadcrumb } from '@/shared/ui/admin-breadcrumb';

import { buildJobDetailBreadcrumbSegments } from '../lib/build-job-detail-breadcrumb';
import { JobDraftDetail } from '../model';

type ContentJobDetailBreadcrumbProps = {
  detail?: JobDraftDetail;
};

export function ContentJobDetailBreadcrumb({ detail }: ContentJobDetailBreadcrumbProps) {
  const pathname = usePathname() ?? '';
  const segments = buildJobDetailBreadcrumbSegments(pathname, detail);

  return <AdminBreadcrumb segments={segments} />;
}
