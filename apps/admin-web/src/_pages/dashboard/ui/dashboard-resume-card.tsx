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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {!loading && isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
