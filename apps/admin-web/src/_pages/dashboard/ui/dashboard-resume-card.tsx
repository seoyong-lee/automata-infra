'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { ReactNode } from 'react';

type DashboardResumeCardProps = {
  title: string;
  description: ReactNode;
  loading: boolean;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
};

export function DashboardResumeCard({
  title,
  description,
  loading,
  emptyMessage,
  isEmpty,
  children,
}: DashboardResumeCardProps) {
  return (
    <Card className="border-admin-outline-ghost bg-admin-surface-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-admin-text-strong">{title}</CardTitle>
        <CardDescription className="text-admin-text-muted">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-admin-text-muted">불러오는 중…</p> : null}
        {!loading && isEmpty ? (
          <p className="text-sm text-admin-text-muted">{emptyMessage}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
