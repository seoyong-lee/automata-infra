'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { LogItem } from '../../model';

type ContentJobDetailLogsViewProps = {
  logs: LogItem[];
};

export function ContentJobDetailLogsView({ logs }: ContentJobDetailLogsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>운영 로그 및 체크포인트</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {logs.map((item) => (
          <div key={item.label} className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-medium">{item.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
