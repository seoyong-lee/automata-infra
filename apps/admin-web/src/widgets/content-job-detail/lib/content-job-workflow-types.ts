/** 발행 탭 내 패널 앵커 (워크플로·체크리스트 이동용). */
export const publishPanelAnchor = {
  review: 'cj-publish-review',
  publishDraft: 'cj-publish-draft',
  queue: 'cj-publish-queue',
} as const;

export type WorkflowNavKey =
  | 'overview'
  | 'idea'
  | 'script'
  | 'assets'
  | 'render'
  | 'review'
  | 'publishDraft'
  | 'queue'
  | 'schedule'
  | 'result';

export type WorkflowNavItem = {
  key: WorkflowNavKey;
  label: string;
  href: string;
  isCurrent: boolean;
  /** 진행 상태 (선택 여부는 isCurrent). */
  state: 'complete' | 'blocked' | 'upcoming';
};

export type ReadinessKey = 'channel' | 'source' | 'review' | 'publishCopy' | 'queue';

export type ReadinessChip = {
  key: ReadinessKey;
  label: string;
  state: 'done' | 'needed' | 'blocked';
  href: string;
};
