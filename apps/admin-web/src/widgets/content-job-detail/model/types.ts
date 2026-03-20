import type { ContentJobDraftDetail } from '@/entities/content-job';

export type WorkspaceView = 'overview' | 'jobs' | 'assets' | 'uploads' | 'templates' | 'logs';

export type SeedForm = {
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
};

export type JobDraftDetail = ContentJobDraftDetail;

export type ExperimentOption = {
  title: string;
  value: string;
  note: string;
};

export type CompareRow = {
  label: string;
  focus: string;
  hook: string;
  renderer: string;
  score: number;
};

export type LogItem = {
  label: string;
  value: string;
  note: string;
};

export type ContextCard = {
  label: string;
  value: string;
};

export type ContentJobDetailViewModel = {
  compareRows: CompareRow[];
  contentLineHref: string;
  experimentOptions: ExperimentOption[];
  logs: LogItem[];
  newJobHref: string;
  readyAssetCount: number;
  sceneCount: number;
  sceneJsonInitialValue: string;
  sceneJsonKey: string;
  seedFormInitialValue: SeedForm;
  seedFormKey: string;
};
