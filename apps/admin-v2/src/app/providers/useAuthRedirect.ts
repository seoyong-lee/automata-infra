'use client';

import { hasStoredSession } from '@packages/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PATHS = new Set(['/login', '/auth/callback', '/pending']);

export const useAuthRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      return;
    }
    if (!hasStoredSession()) {
      router.replace('/login');
    }
  }, [pathname, router]);
};
