'use client';

import type { ImageGenerationProvider } from '@packages/graphql';

import { IMAGE_GENERATION_PROVIDER_OPTIONS } from '../../lib/image-generation-provider-options';

type ContentJobDetailImageModelSelectProps = {
  value: ImageGenerationProvider;
  disabled?: boolean;
  onChange: (value: ImageGenerationProvider) => void;
  className?: string;
};

export function ContentJobDetailImageModelSelect({
  value,
  disabled = false,
  onChange,
  className,
}: ContentJobDetailImageModelSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as ImageGenerationProvider)}
      className={[
        'h-9 rounded-md border border-input bg-background px-3 py-2 text-sm',
        'text-foreground shadow-sm outline-none',
        'focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className ?? '',
      ].join(' ')}
    >
      {IMAGE_GENERATION_PROVIDER_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
