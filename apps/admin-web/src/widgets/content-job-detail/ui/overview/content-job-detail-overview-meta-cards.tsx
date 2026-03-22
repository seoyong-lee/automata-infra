'use client';

import { ExperimentOption, JobDraftDetail } from '../../model';
import { ContentJobDetailOverviewAdoptedCard } from './content-job-detail-overview-adopted-card';
import { ContentJobDetailOverviewExperimentCard } from './content-job-detail-overview-experiment-card';
import { ContentJobDetailOverviewOpsSnapshotCard } from './content-job-detail-overview-ops-snapshot-card';

type Props = {
  detail?: JobDraftDetail;
  experimentOptions: ExperimentOption[];
  readyAssetCount: number;
  stylePreset: string;
  totalScenes: number;
};

export function ContentJobDetailOverviewMetaCards({
  detail,
  experimentOptions,
  readyAssetCount,
  stylePreset,
  totalScenes,
}: Props) {
  return (
    <>
      <ContentJobDetailOverviewAdoptedCard detail={detail} />
      <ContentJobDetailOverviewOpsSnapshotCard
        detail={detail}
        readyAssetCount={readyAssetCount}
        stylePreset={stylePreset}
        totalScenes={totalScenes}
      />
      <ContentJobDetailOverviewExperimentCard experimentOptions={experimentOptions} />
    </>
  );
}
