'use client';

import { ContentJobsSection } from '@/widgets/content-operations';
import type { AdminJob } from '@/entities/admin-job';

type ContentOperationsJobListBlockProps = {
  filteredJobs: AdminJob[];
  isLoading: boolean;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function ContentOperationsJobListBlock({
  filteredJobs,
  isLoading,
  isUploading,
  onUpload,
}: ContentOperationsJobListBlockProps) {
  return (
    <section className="space-y-4 border-t border-border/70 pt-8">
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">콘텐츠 목록</h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">콘텐츠 상세</span>로 들어가면 아이데이션부터
          업로드까지 단계별 화면이 열립니다. 단계 바로가기 링크로 특정 단계로도 이동할 수 있습니다.
        </p>
      </div>

      <ContentJobsSection
        filteredJobs={filteredJobs}
        isLoading={isLoading}
        isUploading={isUploading}
        onUpload={onUpload}
      />
    </section>
  );
}
