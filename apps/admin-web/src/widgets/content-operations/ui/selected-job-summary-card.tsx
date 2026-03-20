import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import Link from 'next/link';
import type { AdminJob } from '@/entities/admin-job';
import { formatStatusLabel } from '../lib';

type Props = {
  selectedJob: AdminJob;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function SelectedJobSummaryCard({ selectedJob, isUploading, onUpload }: Props) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{selectedJob.channelId}</Badge>
            {selectedJob.contentType ? (
              <Badge variant="secondary">{selectedJob.contentType}</Badge>
            ) : null}
            <Badge>{formatStatusLabel(selectedJob.status)}</Badge>
          </div>
          <p className="font-medium">{selectedJob.videoTitle}</p>
          <p className="font-mono text-xs text-muted-foreground">{selectedJob.jobId}</p>
        </div>
        <div className="grid gap-3 text-right text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <p className="font-medium text-foreground">Variant</p>
            <p>{selectedJob.variant ?? '-'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Duration</p>
            <p>{selectedJob.targetDurationSec}s</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Retry</p>
            <p>{selectedJob.retryCount}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Updated</p>
            <p>{selectedJob.updatedAt}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="text-sm text-primary hover:underline" href={`/jobs/${selectedJob.jobId}`}>
          Open Deep Workspace
        </Link>
        <Button
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => onUpload(selectedJob.jobId)}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
