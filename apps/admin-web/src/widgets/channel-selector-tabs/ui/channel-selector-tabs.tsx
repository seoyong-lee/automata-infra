"use client";

import { Button } from "@packages/ui/button";

type ChannelSelectorTabsProps = {
  availableContentIds: string[];
  selectedContentId: string;
  onSelectContentId: (contentId: string) => void;
  isLoading: boolean;
};

export function ChannelSelectorTabs({
  availableContentIds,
  selectedContentId,
  onSelectContentId,
  isLoading,
}: ChannelSelectorTabsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {availableContentIds.map((contentId) => (
          <Button
            key={contentId}
            variant={contentId === selectedContentId ? "default" : "outline"}
            onClick={() => onSelectContentId(contentId)}
          >
            {contentId}
          </Button>
        ))}
      </div>
      {!isLoading && availableContentIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 선택 가능한 채널이 없습니다. 먼저 Settings에서 유튜브 채널을
          추가하세요.
        </p>
      ) : null}
    </div>
  );
}
