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
      ? `/discovery?tab=sources&channel=${encodeURIComponent(contentId)}`
      : '/discovery?tab=sources';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>소재 연결</CardTitle>
          <CardDescription>
            이 제작 아이템이 어떤 소재(Source)를 기반으로 하는지 정합니다. 새 소재는「소재
            발굴」에서 만들고, 여기서는 저장된 소재를 고르거나 바꿉니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!channelOk ? (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              채널이 연결되지 않았습니다. 제작 아이템 허브에서 채널을 먼저 연결하세요.
            </p>
          ) : null}

          {sourceItemId && linked ? <ContentJobDetailLinkedSourcePreview linked={linked} /> : null}

          {sourceItemId && sourceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">소재 정보를 불러오는 중…</p>
          ) : null}

          {!sourceItemId && channelOk ? (
            <p className="text-sm text-muted-foreground">아직 연결된 소재가 없습니다.</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!channelOk}
              onClick={() => setPickerOpen(true)}
            >
              {sourceItemId ? '소재 변경…' : '소재 연결…'}
            </Button>
            {channelOk ? (
              <Link
                href={discoveryHref}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                소재 발굴에서 찾기 · 만들기
              </Link>
            ) : null}
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
