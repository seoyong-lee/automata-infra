'use client';

import { Button } from '@packages/ui/button';
import Link from 'next/link';

import { JobDraftDetail } from '../model';

type ContentJobDetailHeaderActionsProps = {
  contentLineHref: string;
  detail?: JobDraftDetail;
  newJobHref: string;
};

export function ContentJobDetailHeaderActions({
  contentLineHref,
  detail,
  newJobHref,
}: ContentJobDetailHeaderActionsProps) {
  return (
    <>
      <Link className="text-sm text-primary hover:underline" href={contentLineHref}>
        콘텐츠 리스트로
      </Link>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = newJobHref;
        }}
        disabled={!detail?.job.channelId}
      >
        같은 라인으로 새 콘텐츠 만들기
      </Button>
    </>
  );
}
