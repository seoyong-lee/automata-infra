'use client';

import { Button } from '@packages/ui/button';
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
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">콘텐츠 라인</h3>
        <p className="text-sm text-muted-foreground">채널 안에서 생산 단위(라인)를 고릅니다.</p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedContentType === 'all' ? 'default' : 'outline'}
            onClick={() => onSelectContentType('all')}
          >
            전체 콘텐츠
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
      </div>
    </section>
  );
}
