'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { ContentCardSummary } from '../model';

type ContentLinesSectionProps = {
  contentTypes: string[];
  contentCards: ContentCardSummary[];
  selectedContentType: string;
  onSelectContentType: (contentType: string) => void;
};

export function ContentLinesSection({
  contentTypes,
  contentCards,
  selectedContentType,
  onSelectContentType,
}: ContentLinesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Lines</CardTitle>
        <CardDescription>
          선택한 채널 안에서 콘텐츠 라인업을 탭처럼 선택합니다. 개별 영상이 아니라 반복 생산되는
          콘텐츠 단위를 의미합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedContentType === 'all' ? 'default' : 'outline'}
            onClick={() => onSelectContentType('all')}
          >
            All Content
          </Button>
          {contentTypes.map((contentType) => (
            <Button
              key={contentType}
              variant={selectedContentType === contentType ? 'default' : 'outline'}
              onClick={() => onSelectContentType(contentType)}
            >
              {contentType}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contentCards.map((card) => (
            <button
              key={card.contentType}
              type="button"
              className={`rounded-lg border p-4 text-left ${
                selectedContentType === card.contentType
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent/40'
              }`}
              onClick={() => onSelectContentType(card.contentType)}
            >
              <p className="font-medium">{card.contentType}</p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>Total jobs: {card.totalJobs}</p>
                <p>Drafts: {card.draftCount}</p>
                <p>Review queue: {card.reviewCount}</p>
                <p>Failed: {card.failedCount}</p>
                <p>Assets ready: {card.assetReadyCount}</p>
                <p>Upload ready: {card.uploadReadyCount}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
