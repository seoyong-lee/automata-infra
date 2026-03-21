/** 토픽 시드 폼 — Admin 잡 상세에서 사용. */
export type SeedForm = {
  contentId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
  /** 씬·내레이션 방향을 자유 서술로 적는 필드 */
  creativeBrief: string;
};
