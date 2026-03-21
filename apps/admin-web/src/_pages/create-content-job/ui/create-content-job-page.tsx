'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Legacy entry; `/jobs/new` now redirects to `/content`.
 * Kept so imports do not break if referenced; immediately sends users to the catalog.
 */
export function CreateContentJobPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/content');
  }, [router]);
  return null;
}
