import { getContentLineHref, getNewJobHref } from '../lib/detail-links';
import { buildOperationalLogs } from '../lib/detail-logs';
import { getReadyAssetCount, getSceneCount } from '../lib/detail-metrics';
import { getCompareRows, getExperimentOptions } from '../lib/detail-options';
import { getSeedSource, toSeedForm } from '../lib/seed-form';
import type { ContentJobDetailViewModel, JobDraftDetail } from './types';

export { buildContentJobDetailContextCards } from '../lib/detail-context';
export { toSeedForm } from '../lib/seed-form';
export { parseWorkspaceViewParam, workspaceViewKeys, workspaceViews } from '../lib/workspace-views';
export {
  detailWorkspaceTabKeys,
  detailWorkspaceTabs,
  getJobDetailLegacyRedirect,
  jobDetailModeKeys,
  jobDetailRouteTabKeys,
  jobDetailRouteTabs,
  parseAssetStage,
  parseAssetsViewMode,
  parseJobDetailModeParam,
  parseDetailWorkspaceTabParam,
  parseJobDetailRouteTabParam,
} from '../lib/detail-workspace-tabs';
export type {
  CompareRow,
  ContentJobDetailViewModel,
  ContextCard,
  ExperimentOption,
  JobDraftDetail,
  LogItem,
  SeedForm,
  WorkspaceView,
} from './types';
export type {
  AssetStage,
  DetailWorkspaceTabKey,
  JobDetailModeKey,
  JobDetailRouteTabKey,
} from '../lib/detail-workspace-tabs';

export const buildContentJobDetailViewModel = (
  detail?: JobDraftDetail,
): ContentJobDetailViewModel => {
  const readyAssetCount = getReadyAssetCount(detail);
  const sceneCount = getSceneCount(detail);
  const seedSource = getSeedSource(detail);

  return {
    compareRows: getCompareRows(detail, sceneCount, readyAssetCount),
    contentLineHref: getContentLineHref(detail),
    experimentOptions: getExperimentOptions(detail, readyAssetCount),
    logs: buildOperationalLogs(detail, readyAssetCount),
    newJobHref: getNewJobHref(detail),
    readyAssetCount,
    sceneCount,
    sceneJsonInitialValue: detail?.sceneJson ? JSON.stringify(detail.sceneJson, null, 2) : '',
    sceneJsonKey: JSON.stringify(detail?.sceneJson ?? null),
    seedFormInitialValue: toSeedForm(seedSource),
    seedFormKey: JSON.stringify(seedSource ?? null),
  };
};
