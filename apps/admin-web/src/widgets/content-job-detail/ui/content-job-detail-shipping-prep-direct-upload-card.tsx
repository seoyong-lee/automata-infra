'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';

export function ShippingPrepDirectUploadCard({
  jobId,
  isUploading,
  requestUploadError,
  onUpload,
}: {
  jobId: string;
  isUploading: boolean;
  requestUploadError: unknown;
  onUpload: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">직접 업로드 (고급)</CardTitle>
        <p className="text-sm text-muted-foreground">
          기본 흐름은 채널 출고 큐 → 예약·발행입니다. 긴급·테스트 시에만 플랫폼으로 바로 올릴 수
          있습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="secondary" disabled={isUploading} onClick={onUpload}>
          {isUploading ? '업로드 중…' : 'YouTube 업로드 (직접)'}
        </Button>
        {requestUploadError ? (
          <p className="text-sm text-destructive">{getErrorMessage(requestUploadError)}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">jobId: {jobId}</p>
      </CardContent>
    </Card>
  );
}
