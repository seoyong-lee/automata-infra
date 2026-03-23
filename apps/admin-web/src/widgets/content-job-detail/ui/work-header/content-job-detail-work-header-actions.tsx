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

export function ContentJobDetailWorkHeaderActions({
  jobId,
  resolution: _resolution,
  onAction: _onAction,
}: Props) {
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
    <div className="flex shrink-0 flex-col gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-primary">
          Actions
        </p>
        <p className="mt-2 text-sm leading-6 text-admin-text-muted">
          현재 워크벤치에서 필요한 조작만 노출합니다. 삭제는 전체 작업함으로 되돌아가는 파괴적
          작업입니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-admin-outline-ghost bg-admin-surface-card text-admin-text-strong hover:bg-admin-surface-section hover:text-admin-primary"
          disabled={deleteJob.isPending}
          onClick={handleDeleteJob}
        >
          {deleteJob.isPending ? '아이디어 삭제 중…' : '아이디어 삭제'}
        </Button>
      </div>
      <p className="font-mono text-xs text-admin-text-muted">jobId: {jobId}</p>
    </div>
  );
}
