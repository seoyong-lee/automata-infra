import type { WorkspaceView } from '../model/types';

export type ContentPrimarySection = 'planning' | 'media' | 'delivery';

export const primaryWorkspaceSections: Array<{
  key: ContentPrimarySection;
  label: string;
  steps: WorkspaceView[];
}> = [
  { key: 'planning', label: '기획·스크립트', steps: ['ideation', 'script'] },
  { key: 'media', label: '이미지·음성·영상', steps: ['image', 'voice', 'video'] },
  { key: 'delivery', label: '렌더·배포', steps: ['review', 'upload'] },
];

export function getPrimarySectionForStep(step: WorkspaceView): ContentPrimarySection {
  if (step === 'ideation' || step === 'script') {
    return 'planning';
  }
  if (step === 'image' || step === 'voice' || step === 'video') {
    return 'media';
  }
  return 'delivery';
}

export function getPrimarySectionMeta(section: ContentPrimarySection) {
  return primaryWorkspaceSections.find((s) => s.key === section);
}

export function getFirstStepInPrimarySection(section: ContentPrimarySection): WorkspaceView {
  const meta = getPrimarySectionMeta(section);
  return meta?.steps[0] ?? 'ideation';
}
