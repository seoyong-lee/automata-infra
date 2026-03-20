'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { AdminJob } from '@/entities/admin-job';
import { SelectedJobInsightsGrid } from './selected-job-insights-grid';
import { SelectedJobSummaryCard } from './selected-job-summary-card';

type Props = {
  selectedJob: AdminJob | null;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function SelectedJobPanelSection({ selectedJob, isUploading, onUpload }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Job Panel</CardTitle>
        <CardDescription>
          선택한 잡의 상태와 다음 액션을 우측 패널에서 바로 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedJob ? (
          <>
            <SelectedJobSummaryCard
              selectedJob={selectedJob}
              isUploading={isUploading}
              onUpload={onUpload}
            />
            <SelectedJobInsightsGrid selectedJob={selectedJob} />
          </>
        ) : null}
        {!selectedJob ? (
          <p className="text-sm text-muted-foreground">
            현재 선택된 필터에 맞는 잡이 없습니다. 다른 콘텐츠 라인이나 필터를 선택해 보세요.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
