'use client';

import { useDeleteJobMutation } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';

type Props = {
  jobId: string;
  resolution: unknown;
  onAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailWorkHeaderActions({ jobId, resolution: _resolution, onAction: _onAction }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteJob = useDeleteJobMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
      router.push('/jobs');
    },
  });

  const handleDeleteJob = () => {
    const ok = window.confirm(
      '이 아이디어를 삭제할까요? 관련 제작 상태와 산출물 참조가 함께 사라질 수 있습니다.',
    );
    if (!ok) {
      return;
    }
    deleteJob.mutate({ jobId });
  };

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-admin-outline-ghost bg-admin-surface-card text-admin-text-strong hover:bg-admin-surface-section hover:text-admin-primary"
          disabled={deleteJob.isPending}
          onClick={handleDeleteJob}
        >
          {deleteJob.isPending ? '아이디어 삭제 중…' : '아이디어 삭제'}
        </Button>
      </div>
    </div>
  );
}
