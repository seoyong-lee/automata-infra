import { loadPlanConfig } from "../normalize/load-plan-config";
import type {
  ContentPresetPromptOverride,
  PresetSnapshot,
  ResolvedPolicy,
} from "../../shared/lib/contracts/content-presets";
import type { GenerateStructuredData } from "../../shared/lib/llm";

export type JobPlanResult = {
  jobId: string;
  contentId: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  status: string;
  jobPlanS3Key: string;
  createdAt: string;
};

export type JobPlanSeed = {
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

export type JobBriefOverrides = {
  contentId?: string;
  targetLanguage?: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

export type CreateJobPlanDeps = {
  now?: () => string;
  generateStructuredData?: GenerateStructuredData;
  loadConfig?: typeof loadPlanConfig;
  jobId?: string;
  jobBrief?: JobBriefOverrides;
};

export type { ContentPresetPromptOverride };
