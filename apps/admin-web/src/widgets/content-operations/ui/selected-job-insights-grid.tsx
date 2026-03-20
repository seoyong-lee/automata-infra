import type { AdminJob } from '@/entities/admin-job';
import { estimateExperimentScore } from '../lib';

type Props = {
  selectedJob: AdminJob;
};

export function SelectedJobInsightsGrid({ selectedJob }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-4 text-sm">
        <p className="text-xs text-muted-foreground">Pipeline</p>
        <p className="mt-1 font-medium">
          {selectedJob.status === 'UPLOADED' || selectedJob.status === 'RENDERED'
            ? 'scene package -> shotstack'
            : 'scene package -> assets -> render'}
        </p>
      </div>
      <div className="rounded-lg border p-4 text-sm">
        <p className="text-xs text-muted-foreground">Publish mode</p>
        <p className="mt-1 font-medium">
          {selectedJob.autoPublish ? 'Auto publish' : 'Needs review'}
        </p>
      </div>
      <div className="rounded-lg border p-4 text-sm">
        <p className="text-xs text-muted-foreground">Estimated score</p>
        <p className="mt-1 font-medium">
          {estimateExperimentScore({
            status: selectedJob.status,
            autoPublish: selectedJob.autoPublish,
            retryCount: selectedJob.retryCount,
          })}
        </p>
      </div>
    </div>
  );
}
