'use client';

import {
  ContentJobDetailSceneBuildPanel,
  ContentJobDetailSeedFormPanel,
} from '@/features/content-job-detail';
import { type CompareRow, type SeedForm } from '../model';

type ContentJobDetailJobsViewProps = {
  compareRows: CompareRow[];
  runSceneJsonError: unknown;
  runTopicPlanError: unknown;
  sceneJsonInitialValue: string;
  sceneJsonKey: string;
  seedFormInitialValue: SeedForm;
  seedFormKey: string;
  updateSceneJsonError: unknown;
  updateTopicSeedError: unknown;
  isRunningSceneJson: boolean;
  isRunningTopicPlan: boolean;
  isSavingSceneJson: boolean;
  isSavingTopicSeed: boolean;
  onRunSceneJson: () => void;
  onRunTopicPlan: () => void;
  onSaveSceneJson: (value: string) => void;
  onSaveTopicSeed: (value: SeedForm) => void;
};

export function ContentJobDetailJobsView({
  compareRows,
  runSceneJsonError,
  runTopicPlanError,
  sceneJsonInitialValue,
  sceneJsonKey,
  seedFormInitialValue,
  seedFormKey,
  updateSceneJsonError,
  updateTopicSeedError,
  isRunningSceneJson,
  isRunningTopicPlan,
  isSavingSceneJson,
  isSavingTopicSeed,
  onRunSceneJson,
  onRunTopicPlan,
  onSaveSceneJson,
  onSaveTopicSeed,
}: ContentJobDetailJobsViewProps) {
  return (
    <div className="space-y-6">
      <ContentJobDetailSeedFormPanel
        key={seedFormKey}
        initialValue={seedFormInitialValue}
        isRunningTopicPlan={isRunningTopicPlan}
        isSaving={isSavingTopicSeed}
        onRunTopicPlan={onRunTopicPlan}
        onSave={onSaveTopicSeed}
        runError={runTopicPlanError}
        saveError={updateTopicSeedError}
      />
      <ContentJobDetailSceneBuildPanel
        key={sceneJsonKey}
        compareRows={compareRows}
        initialValue={sceneJsonInitialValue}
        runError={runSceneJsonError}
        saveError={updateSceneJsonError}
        isRunning={isRunningSceneJson}
        isSaving={isSavingSceneJson}
        onRun={onRunSceneJson}
        onSave={onSaveSceneJson}
      />
    </div>
  );
}
