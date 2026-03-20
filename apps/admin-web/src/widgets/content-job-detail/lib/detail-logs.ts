import { getPublishPath } from './detail-values';
import type { JobDraftDetail, LogItem } from '../model/types';

export const buildOperationalLogs = (
  detail: JobDraftDetail | undefined,
  readyAssetCount: number,
): LogItem[] => {
  return [
    {
      label: 'Current status',
      value: detail?.job.status ?? '-',
      note: '콘텐츠 라인 내부에서 이 잡이 어느 단계에 있는지 보여줍니다.',
    },
    {
      label: 'Topic seed ready',
      value: detail?.topicSeed ? 'yes' : 'no',
      note: '사람이 직접 편집 가능한 seed 초안이 저장되었는지 확인합니다.',
    },
    {
      label: 'Scene JSON ready',
      value: detail?.sceneJson ? 'yes' : 'no',
      note: 'renderer-neutral scene package가 준비되었는지 나타냅니다.',
    },
    {
      label: 'Asset coverage',
      value: `${readyAssetCount}/${detail?.assets.length ?? 0}`,
      note: 'scene별 이미지/비디오/보이스 중 최소 하나라도 준비된 비율입니다.',
    },
    {
      label: 'Publish path',
      value: getPublishPath(detail),
      note: '업로드 전 review gate가 필요한지 빠르게 판단합니다.',
    },
    {
      label: 'Last updated',
      value: detail?.job.updatedAt ?? '-',
      note: '운영자가 마지막으로 이 잡을 다시 확인해야 할 시점을 가늠합니다.',
    },
  ];
};
