export type JobWorkPrimaryAction =
  | 'run_topic_plan'
  | 'run_scene_json'
  | 'run_assets'
  | 'open_reviews'
  | 'go_publish'
  | 'go_ideation'
  | 'go_scene'
  | 'go_assets'
  | 'go_timeline'
  | 'go_overview';

export type JobWorkActionResolution = {
  pipelineStageLabel: string;
  primary: {
    label: string;
    action: JobWorkPrimaryAction;
    disabled: boolean;
  };
  secondary?: {
    label: string;
    action: JobWorkPrimaryAction;
    disabled: boolean;
  };
  note?: string;
};

export type JobWorkPendingFlags = {
  isRunningTopicPlan: boolean;
  isRunningSceneJson: boolean;
  isRunningAssetGeneration: boolean;
};
