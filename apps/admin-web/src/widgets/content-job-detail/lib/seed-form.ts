import type { JobDraftDetail, SeedForm } from '../model/types';

type SeedSource = {
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

export const toSeedForm = (input?: SeedSource | null): SeedForm => {
  return {
    channelId: input?.channelId ?? '',
    targetLanguage: input?.targetLanguage ?? '',
    titleIdea: input?.titleIdea ?? '',
    targetDurationSec:
      typeof input?.targetDurationSec === 'number' ? String(input.targetDurationSec) : '45',
    stylePreset: input?.stylePreset ?? '',
  };
};

export const getSeedSource = (detail?: JobDraftDetail) => {
  return detail?.topicSeed ?? detail?.topicPlan ?? undefined;
};
