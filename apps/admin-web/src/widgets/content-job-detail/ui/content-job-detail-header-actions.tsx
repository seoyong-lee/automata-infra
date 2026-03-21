'use client';

import { Button } from '@packages/ui/button';
import Link from 'next/link';

import { JobDraftDetail } from '../model';

type ContentJobDetailHeaderActionsProps = {
  detail?: JobDraftDetail;
  newJobHref: string;
};

export function ContentJobDetailHeaderActions({
  detail,
  newJobHref,
}: ContentJobDetailHeaderActionsProps) {
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = newJobHref;
        }}
        disabled={!detail?.job.contentId}
      >
        같은 라인으로 새 콘텐츠 만들기
      </Button>
    </>
  );
}
