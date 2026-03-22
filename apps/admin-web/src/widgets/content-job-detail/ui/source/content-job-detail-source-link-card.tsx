'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID, useSourceItemQuery } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useState } from 'react';

import { ContentJobDetailLinkedSourcePreview } from './content-job-detail-linked-source-preview';
import { ContentJobDetailSourcePickerModal } from './content-job-detail-source-picker-modal';

type ContentJobDetailSourceLinkCardProps = {
  jobId: string;
  contentId?: string | null;
  sourceItemId?: string | null;
};

// eslint-disable-next-line complexity -- channel/source 연결 분기
export function ContentJobDetailSourceLinkCard({
  jobId,
  contentId,
  sourceItemId,
}: ContentJobDetailSourceLinkCardProps) {
  const channelOk =
    Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID && Boolean(contentId?.trim());

  const sourceQuery = useSourceItemQuery(
    { id: sourceItemId ?? '' },
    { enabled: Boolean(sourceItemId) },
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  const linked = sourceQuery.data;
  const err = sourceQuery.error;

  const discoveryHref =
    contentId && channelOk
      ? `/discovery?tab=saved&channel=${encodeURIComponent(contentId)}`
      : '/discovery?tab=saved';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>소재 연결</CardTitle>
          <CardDescription>
            이 아이템이 어떤 소재를 기준으로 제작되는지 확인하고 바꿉니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!channelOk ? (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              이 아이템은 아직 채널에 연결되지 않았습니다. 워크플로 작업은 계속 진행할 수 있고,
              소재는 채널을 붙인 뒤 나중에 연결하면 됩니다.
            </p>
          ) : null}

          {sourceItemId && linked ? <ContentJobDetailLinkedSourcePreview linked={linked} /> : null}

          {sourceItemId && sourceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">소재 정보를 불러오는 중…</p>
          ) : null}

          {!sourceItemId ? (
            <p className="text-sm text-muted-foreground">
              {channelOk
                ? '아직 연결된 소재가 없습니다.'
                : '채널 연결 전에는 소재 연결이 선택 사항입니다.'}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {channelOk ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                {sourceItemId ? '소재 변경' : '소재 연결'}
              </Button>
            ) : (
              <Link
                href="/jobs"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                나중에 채널 연결
              </Link>
            )}
            {channelOk ? (
              <Link
                href={discoveryHref}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                소재 탐색 열기
              </Link>
            ) : (
              <Link
                href="/discovery?tab=saved"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                전역 소재 보기
              </Link>
            )}
          </div>

          {err ? <p className="text-sm text-destructive">{getErrorMessage(err)}</p> : null}
        </CardContent>
      </Card>

      {channelOk && contentId ? (
        <ContentJobDetailSourcePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          jobId={jobId}
          contentId={contentId}
          discoveryHref={discoveryHref}
          channelOk={channelOk}
        />
      ) : null}
    </>
  );
}
