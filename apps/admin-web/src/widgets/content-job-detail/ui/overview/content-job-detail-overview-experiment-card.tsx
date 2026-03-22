'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { ExperimentOption } from '../../model';

type Props = {
  experimentOptions: ExperimentOption[];
};

export function ContentJobDetailOverviewExperimentCard({ experimentOptions }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>실험·지표 힌트</CardTitle>
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
  );
}
