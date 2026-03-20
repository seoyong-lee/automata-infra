'use client';

import type { AdminJob } from '@/entities/admin-job';
import { ContentJobCard } from './content-job-card';

type Props = {
  filteredJobs: AdminJob[];
  isLoading: boolean;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function ContentJobsSection({ filteredJobs, isLoading, isUploading, onUpload }: Props) {
  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading content jobs...</p> : null}

      {filteredJobs.map((job) => (
        <ContentJobCard key={job.jobId} job={job} isUploading={isUploading} onUpload={onUpload} />
      ))}

      {!isLoading && filteredJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">선택한 채널/콘텐츠에 아직 잡이 없습니다.</p>
      ) : null}
    </div>
  );
}
