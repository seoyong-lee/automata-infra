import type { CompareRow, ExperimentOption, JobDraftDetail } from '../model/types';
import { buildExperimentScore } from './detail-metrics';
import { getLayoutPreset, getRendererTrack } from './detail-values';

export const getExperimentOptions = (
  detail: JobDraftDetail | undefined,
  readyAssetCount: number,
): ExperimentOption[] => {
  return [
    {
      title: 'Scene Package',
      value: 'structured scene JSON',
      note: 'renderer-independent timeline source of truth',
    },
    {
      title: 'Layout Preset',
      value: getLayoutPreset(detail),
      note: 'template candidate for next rerender',
    },
    {
      title: 'Renderer Track',
      value: getRendererTrack(detail),
      note: 'FFmpeg/Fargate swap should stay behind same scene package',
    },
    {
      title: 'Asset Strategy',
      value: readyAssetCount > 0 ? 'asset-first orchestration' : 'awaiting assets',
      note: 'image / video / voice generated before final composition',
    },
  ];
};

export const getCompareRows = (
  detail: JobDraftDetail | undefined,
  sceneCount: number,
  readyAssetCount: number,
): CompareRow[] => {
  const score = buildExperimentScore({
    status: detail?.job.status,
    sceneCount,
    assetReadyCount: readyAssetCount,
    autoPublish: detail?.job.autoPublish,
  });

  return [
    {
      label: detail?.contentBrief?.variant ?? detail?.job.variant ?? 'current',
      focus: 'balanced current',
      hook: 'current hook',
      renderer:
        detail?.job.status === 'RENDERED' || detail?.job.status === 'UPLOADED'
          ? 'shotstack'
          : 'scene-only',
      score,
    },
    {
      label: 'hook-boost',
      focus: 'stronger headline / caption opening',
      hook: 'more aggressive hook',
      renderer: 'same renderer',
      score: Math.max(0, score - 4),
    },
    {
      label: 'visual-fallback',
      focus: 'image-first fallback / lighter assets',
      hook: 'same hook',
      renderer: 'shotstack -> ffmpeg spike',
      score: Math.max(0, score - 8),
    },
  ];
};
