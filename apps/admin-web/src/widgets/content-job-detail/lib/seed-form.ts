import type { JobDraftDetail, SeedForm } from '../model/types';

type SeedSource = {
  contentId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string | null;
};

const orEmpty = (value: string | undefined | null): string => value ?? '';

const durationSecToFormString = (input?: SeedSource | null): string => {
  if (input && typeof input.targetDurationSec === 'number') {
    return String(input.targetDurationSec);
  }
  return '45';
};

const creativeBriefToFormString = (input?: SeedSource | null): string => {
  return input?.creativeBrief?.trim() ?? '';
};

export function toSeedForm(input?: SeedSource | null): SeedForm {
  return {
    contentId: orEmpty(input?.contentId),
    targetLanguage: orEmpty(input?.targetLanguage),
    titleIdea: orEmpty(input?.titleIdea),
    targetDurationSec: durationSecToFormString(input),
    stylePreset: orEmpty(input?.stylePreset),
    creativeBrief: creativeBriefToFormString(input),
  };
}

export const getSeedSource = (detail?: JobDraftDetail) => {
  return detail?.topicSeed ?? detail?.topicPlan ?? undefined;
};
