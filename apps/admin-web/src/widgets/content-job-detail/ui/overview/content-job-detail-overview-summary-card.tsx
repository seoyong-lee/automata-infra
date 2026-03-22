'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';

import type { JobDraftDetail } from '../../model';
import { ContentJobDetailOverviewSummaryFooter } from './content-job-detail-overview-summary-footer';
import { ContentJobDetailOverviewSummaryGrid } from './content-job-detail-overview-summary-grid';

type Props = {
  jobId: string;
  detail?: JobDraftDetail;
  status: string;
  stageIdx: number;
  channelLinked: boolean;
  contentId?: string | null;
  sameLineNewJobHref?: string;
};

export function ContentJobDetailOverviewSummaryCard({
  jobId,
  detail,
  status,
  stageIdx,
  channelLinked,
  contentId,
  sameLineNewJobHref,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>제작 아이템 요약</CardTitle>
        <CardDescription>
          채널·상태·길이를 한곳에 두고, 아래에서 단계별 후보·채택·실행 이력으로 이어갑니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ContentJobDetailOverviewSummaryGrid
          detail={detail}
          status={status}
          stageIdx={stageIdx}
          channelLinked={channelLinked}
          contentId={contentId}
        />
        <ContentJobDetailOverviewSummaryFooter
          jobId={jobId}
          channelLinked={channelLinked}
          sameLineNewJobHref={sameLineNewJobHref}
        />
      </CardContent>
    </Card>
  );
}
