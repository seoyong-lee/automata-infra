import { Button } from '@packages/ui/button';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

type YoutubeChannelConfigActionsProps = {
  config?: YoutubeChannelConfig;
  upsertPending: boolean;
  deletePending: boolean;
  onSave: () => void;
  onDelete: () => void;
};

export function YoutubeChannelConfigActions({
  config,
  upsertPending,
  deletePending,
  onSave,
  onDelete,
}: YoutubeChannelConfigActionsProps) {
  return (
    <div className="flex gap-2">
      <Button disabled={upsertPending} onClick={onSave}>
        {upsertPending ? 'Saving...' : config ? 'Save Channel' : 'Add Channel'}
      </Button>
      {config ? (
        <Button
          variant="outline"
          disabled={deletePending || config.source !== 'db'}
          onClick={onDelete}
        >
          {deletePending ? 'Deleting...' : 'Delete Channel'}
        </Button>
      ) : null}
    </div>
  );
}
