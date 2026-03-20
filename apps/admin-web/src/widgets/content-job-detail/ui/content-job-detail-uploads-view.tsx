'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

import type { JobDraftDetail } from '../model';

type ContentJobDetailUploadsViewProps = {
  detail?: JobDraftDetail;
  error: unknown;
  isUploading: boolean;
  onOpenReviews: () => void;
  onUpload: () => void;
};

const getPublishModeLabel = (detail?: JobDraftDetail) => {
  return (detail?.contentBrief?.autoPublish ?? detail?.job.autoPublish)
    ? '렌더 후 자동 공개'
    : '공개 전 수동 검수';
};

export function ContentJobDetailUploadsView({
  detail,
  error,
  isUploading,
  onOpenReviews,
  onUpload,
}: ContentJobDetailUploadsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>업로드</CardTitle>
        <p className="text-sm text-muted-foreground">
          {getPublishModeLabel(detail)} · 업로드 {detail?.job.uploadStatus ?? '미시작'}
          {detail?.job.uploadVideoId ? ` · 영상 ID ${detail.job.uploadVideoId}` : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={isUploading} onClick={onUpload}>
            {isUploading ? '업로드 중...' : 'YouTube 업로드'}
          </Button>
          <Button variant="outline" onClick={onOpenReviews}>
            작업 현황
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      </CardContent>
    </Card>
  );
}
