'use client';

import { cn } from '@packages/ui';

import type { VoiceProfile } from '@/entities/voice-profile';

type ContentJobDetailVoiceProfileSelectProps = {
  voiceProfiles: VoiceProfile[];
  value?: string | null;
  disabled?: boolean;
  className?: string;
  emptyLabel: string;
  onChange: (profileId?: string) => void;
};

export function ContentJobDetailVoiceProfileSelect({
  voiceProfiles,
  value,
  disabled = false,
  className,
  emptyLabel,
  onChange,
}: ContentJobDetailVoiceProfileSelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
        className,
      )}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value ? event.target.value : undefined)}
    >
      <option value="">{emptyLabel}</option>
      {voiceProfiles.map((profile) => (
        <option key={profile.profileId} value={profile.profileId}>
          {profile.label}
        </option>
      ))}
    </select>
  );
}
