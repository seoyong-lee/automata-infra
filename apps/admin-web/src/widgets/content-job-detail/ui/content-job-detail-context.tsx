'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { buildContentJobDetailContextCards, type JobDraftDetail } from '../model';

type ContentJobDetailContextProps = {
  detail?: JobDraftDetail;
};

export function ContentJobDetailContext({ detail }: ContentJobDetailContextProps) {
  const contextCards = buildContentJobDetailContextCards(detail);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {'이 화면은 채널 > 채널 상세 > 제작 아이템 순서 중 마지막 깊은 작업 공간입니다.'}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {contextCards.map((item) => (
            <div key={item.label} className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
