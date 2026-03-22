import type { AdminJob } from '@packages/graphql';

import type { JobWorkActionResolution, JobWorkPendingFlags } from './job-work-action-types';
import * as branches from './resolve-job-work-action-branches';

export type {
  JobWorkActionResolution,
  JobWorkPendingFlags,
  JobWorkPrimaryAction,
} from './job-work-action-types';

type ResolveOpts = {
  hasTopicPlan: boolean;
  hasSceneJson: boolean;
  sceneCount: number;
  readyAssetCount: number;
};

export function resolveJobWorkAction(
  job: AdminJob | undefined,
  opts: ResolveOpts,
  pending: JobWorkPendingFlags,
): JobWorkActionResolution {
  const status = job?.status ?? 'DRAFT';
  const pipelineStageLabel = branches.pipelineStageLabelForJob(job);
  if (status === 'FAILED') {
    return branches.resolveFailedBranch(pipelineStageLabel);
  }
  const attempts: Array<() => JobWorkActionResolution | null> = [
    () => branches.resolveNoTopicBranch(pipelineStageLabel, status, opts, pending),
    () => branches.resolveNoSceneBranch(pipelineStageLabel, status, opts, pending),
    () => branches.resolveEarlyWithSceneBranch(pipelineStageLabel, status, opts, pending),
    () => branches.resolveSceneJsonBuildingBranch(pipelineStageLabel, status),
    () => branches.resolveSceneJsonReadyBranch(pipelineStageLabel, status, pending),
    () => branches.resolveAssetGeneratingBranch(pipelineStageLabel, status),
    () => branches.resolveAssetsReadyishBranch(pipelineStageLabel, status, opts),
    () => branches.resolveReviewPendingBranch(pipelineStageLabel, status),
    () => branches.resolveApprovedBranch(pipelineStageLabel, status),
    () => branches.resolveRejectedBranch(pipelineStageLabel, status),
    () => branches.resolveUploadedBranch(pipelineStageLabel, status),
  ];
  for (const tryResolve of attempts) {
    const next = tryResolve();
    if (next) {
      return next;
    }
  }
  return branches.resolveDefaultBranch(pipelineStageLabel);
}
