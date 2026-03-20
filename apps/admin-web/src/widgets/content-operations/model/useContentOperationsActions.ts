'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRequestJobUpload } from '@/entities/admin-job';

export const useContentOperationsActions = () => {
  const queryClient = useQueryClient();

  const requestUpload = useRequestJobUpload({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });

  return {
    isUploading: requestUpload.isPending,
    onUpload: (jobId: string) => requestUpload.mutate({ jobId }),
  };
};
