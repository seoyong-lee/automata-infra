'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { CompareRow, ExperimentOption } from '../model';

type ContentJobDetailTemplatesViewProps = {
  compareRows: CompareRow[];
  experimentOptions: ExperimentOption[];
};

export function ContentJobDetailTemplatesView({
  compareRows,
  experimentOptions,
}: ContentJobDetailTemplatesViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Production Option Tracks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experimentOptions.map((item) => (
            <div key={item.title} className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-medium">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variant Comparison</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {compareRows.map((row) => (
            <div key={row.label} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{row.label}</p>
              <p className="mt-1 text-muted-foreground">{row.focus}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>Hook: {row.hook}</p>
                <p>Renderer: {row.renderer}</p>
                <p>Score: {row.score}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
