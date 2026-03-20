import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import Link from 'next/link';
import type { AdminJob } from '@/entities/admin-job';

type Props = {
  job: AdminJob;
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function ContentJobCard({ job, selectedJobId, onSelectJob, isUploading, onUpload }: Props) {
  return (
    <div
      className={`w-full rounded-lg border p-4 ${
        selectedJobId === job.jobId ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{job.status}</Badge>
            {job.contentType ? <Badge variant="secondary">{job.contentType}</Badge> : null}
            {job.variant ? (
              <span className="text-xs text-muted-foreground">{job.variant}</span>
            ) : null}
          </div>
          <p className="font-medium">{job.videoTitle}</p>
          <p className="font-mono text-xs text-muted-foreground">{job.jobId}</p>
        </div>

        <div className="grid gap-3 text-right text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <p className="font-medium text-foreground">Duration</p>
            <p>{job.targetDurationSec}s</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Publish</p>
            <p>{job.autoPublish ? 'auto' : 'manual'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Retry</p>
            <p>{job.retryCount}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Updated</p>
            <p>{job.updatedAt}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedJobId === job.jobId ? 'default' : 'outline'}
          onClick={() => onSelectJob(job.jobId)}
        >
          {selectedJobId === job.jobId ? 'Selected' : 'Select'}
        </Button>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">script</span>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">image</span>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">video</span>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">upload</span>
        <Link className="text-sm text-primary hover:underline" href={`/jobs/${job.jobId}`}>
          Open content detail
        </Link>
        <Button
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => onUpload(job.jobId)}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
