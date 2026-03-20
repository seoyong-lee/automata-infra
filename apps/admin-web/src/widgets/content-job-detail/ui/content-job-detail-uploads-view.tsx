'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

import type { JobDraftDetail } from '../model';
import { ContentJobDetailUploadSummaryCard } from './content-job-detail-upload-summary-card';

type ContentJobDetailUploadsViewProps = {
  detail?: JobDraftDetail;
  error: unknown;
  isUploading: boolean;
  onOpenReviews: () => void;
  onUpload: () => void;
};

const getPublishModeLabel = (detail?: JobDraftDetail) => {
  return (detail?.contentBrief?.autoPublish ?? detail?.job.autoPublish)
    ? 'Auto publish after render'
    : 'Manual review before publish';
};

const getUploadSummary = (detail?: JobDraftDetail) => {
  return [
    {
      label: 'Publish Mode',
      value: getPublishModeLabel(detail),
    },
    {
      label: 'Upload Status',
      value: detail?.job.uploadStatus ?? 'not started',
    },
    {
      label: 'Uploaded Video ID',
      value: detail?.job.uploadVideoId ?? '-',
    },
  ];
};

export function ContentJobDetailUploadsView({
  detail,
  error,
  isUploading,
  onOpenReviews,
  onUpload,
}: ContentJobDetailUploadsViewProps) {
  const uploadSummary = getUploadSummary(detail);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {uploadSummary.map((item) => (
            <ContentJobDetailUploadSummaryCard
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={isUploading} onClick={onUpload}>
            {isUploading ? 'Uploading...' : 'Upload to YouTube'}
          </Button>
          <Button variant="outline" onClick={onOpenReviews}>
            Open Review Queue
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
        <p className="text-xs text-muted-foreground">
          대시보드에서는 업로드 병목만 감지하고, 실제 업로드 조작은 이 화면에서 수행합니다.
        </p>
      </CardContent>
    </Card>
  );
}
