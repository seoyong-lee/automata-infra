'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { AdminJob } from '@/entities/admin-job';
import { ContentJobCard } from './content-job-card';

type Props = {
  filteredJobs: AdminJob[];
  isLoading: boolean;
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function ContentJobsSection({
  filteredJobs,
  isLoading,
  selectedJobId,
  onSelectJob,
  isUploading,
  onUpload,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Jobs</CardTitle>
        <CardDescription>
          실제 운영 단위인 잡을 리스트로 보고, 우측 패널 및 deep workspace로 drill-in 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading content jobs...</p>
        ) : null}

        {filteredJobs.map((job) => (
          <ContentJobCard
            key={job.jobId}
            job={job}
            selectedJobId={selectedJobId}
            onSelectJob={onSelectJob}
            isUploading={isUploading}
            onUpload={onUpload}
          />
        ))}

        {!isLoading && filteredJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">선택한 채널/콘텐츠에 아직 잡이 없습니다.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
