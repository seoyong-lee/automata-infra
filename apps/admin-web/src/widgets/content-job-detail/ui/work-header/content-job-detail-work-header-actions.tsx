'use client';

import { useDeleteJobMutation } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import { JobWorkActionButtonGroup } from './job-work-action-button-group';

type Props = {
  jobId: string;
  resolution: JobWorkActionResolution;
  onAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailWorkHeaderActions({ jobId, resolution, onAction }: Props) {
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
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleteJob.isPending}
          onClick={handleDeleteJob}
        >
          {deleteJob.isPending ? '아이디어 삭제 중…' : '아이디어 삭제'}
        </Button>
      </div>
    </div>
  );
}
