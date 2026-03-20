"use client";

import { Button } from "@packages/ui/button";

type ChannelSelectorTabsProps = {
  availableChannels: string[];
  selectedChannel: string;
  onSelectChannel: (channelId: string) => void;
  isLoading: boolean;
};

export function ChannelSelectorTabs({
  availableChannels,
  selectedChannel,
  onSelectChannel,
  isLoading,
}: ChannelSelectorTabsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {availableChannels.map((channelId) => (
          <Button
            key={channelId}
            variant={channelId === selectedChannel ? "default" : "outline"}
            onClick={() => onSelectChannel(channelId)}
          >
            {channelId}
          </Button>
        ))}
      </div>
      {!isLoading && availableChannels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 선택 가능한 채널이 없습니다. 먼저 Settings에서 유튜브 채널을
          추가하세요.
        </p>
      ) : null}
    </div>
  );
}
