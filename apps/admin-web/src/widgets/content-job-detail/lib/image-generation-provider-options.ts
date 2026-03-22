import type { ImageGenerationProvider } from '@packages/graphql';

export const IMAGE_GENERATION_PROVIDER_OPTIONS: Array<{
  value: ImageGenerationProvider;
  label: string;
}> = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'SEEDREAM', label: 'Seedream' },
];

export const getImageGenerationProviderLabel = (value: ImageGenerationProvider): string => {
  return IMAGE_GENERATION_PROVIDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
};
