'use client';

import { useEffect, useState } from 'react';

import type { JobDetailRouteTabKey } from '../lib/detail-workspace-tabs';

/** 발행 탭에서만 URL 해시(패널)를 추적한다. */
export function useContentJobPublishHash(activeTab: JobDetailRouteTabKey): string {
  const [hash, setHash] = useState('');

  useEffect(() => {
    if (activeTab !== 'publish' || typeof window === 'undefined') {
      return;
    }
    const read = () => {
      setHash(window.location.hash.replace(/^#/, ''));
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [activeTab]);

  return activeTab === 'publish' ? hash : '';
}
