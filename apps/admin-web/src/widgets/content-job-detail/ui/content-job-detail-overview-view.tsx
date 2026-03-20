'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { ExperimentOption, JobDraftDetail } from '../model';

type ContentJobDetailOverviewViewProps = {
  detail?: JobDraftDetail;
  experimentOptions: ExperimentOption[];
  readyAssetCount: number;
  stylePreset: string;
};

export function ContentJobDetailOverviewView({
  detail,
  experimentOptions,
  readyAssetCount,
  stylePreset,
}: ContentJobDetailOverviewViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">Recent upload</p>
            <p className="mt-1 font-medium">{detail?.job.uploadVideoId ?? 'not uploaded yet'}</p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">Review queue</p>
            <p className="mt-1 font-medium">{detail?.job.reviewAction ?? 'PENDING'}</p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">Assets ready</p>
            <p className="mt-1 font-medium">
              {readyAssetCount}/{detail?.assets.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">Active template</p>
            <p className="mt-1 font-medium">{stylePreset || '-'}</p>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
