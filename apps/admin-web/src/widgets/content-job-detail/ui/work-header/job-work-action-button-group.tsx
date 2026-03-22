'use client';

import { Button } from '@packages/ui/button';

import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';

function SecondaryButton({
  secondary,
  onAction,
}: {
  secondary: NonNullable<JobWorkActionResolution['secondary']>;
  onAction: (action: JobWorkPrimaryAction) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={secondary.disabled}
      onClick={() => onAction(secondary.action)}
    >
      {secondary.label}
    </Button>
  );
}

type Props = {
  resolution: JobWorkActionResolution;
  onAction: (action: JobWorkPrimaryAction) => void;
};

export function JobWorkActionButtonGroup({ resolution, onAction }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        disabled={resolution.primary.disabled}
        onClick={() => onAction(resolution.primary.action)}
      >
        {resolution.primary.label}
      </Button>
      {resolution.secondary ? (
        <SecondaryButton secondary={resolution.secondary} onAction={onAction} />
      ) : null}
    </div>
  );
}
