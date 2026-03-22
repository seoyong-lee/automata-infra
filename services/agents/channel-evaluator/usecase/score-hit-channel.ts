import {
  computeOverallChannelScore,
  type ChannelScoreSnapshot,
  type ChannelSignal,
} from "../../../../lib/modules/agents/contracts/agent-domain";

/**
 * 규칙 기반 히트 채널 점수(placeholder). YouTube API 연동 시 `recentWindow`·stats를 실제 값으로 교체.
 */
export const buildSnapshotPayloadFromSignal = (input: {
  signal: ChannelSignal;
  contentId?: string;
}): Omit<ChannelScoreSnapshot, "id"> => {
  const { signal } = input;
  const rw = signal.recentWindow;
  const p90 = rw.p90Views ?? 0;
  const momentumScore =
    p90 > 1_000_000 ? 0.9 : p90 > 200_000 ? 0.72 : p90 > 50_000 ? 0.55 : 0.38;
  const cadence = rw.uploadCadencePerWeek ?? 0;
  const consistencyScore = cadence >= 5 ? 0.75 : cadence >= 2 ? 0.55 : 0.35;
  const reproducibilityScore = rw.sampledVideoCount >= 15 ? 0.7 : 0.52;
  const nicheFitScore = input.contentId ? 0.55 : 0.45;
  const monetizationScore = 0.52;
  const overallScore = computeOverallChannelScore({
    momentumScore,
    consistencyScore,
    reproducibilityScore,
    nicheFitScore,
    monetizationScore,
  });
  return {
    platform: signal.platform,
    externalChannelId: signal.externalChannelId,
    contentId: input.contentId,
    status: "ACTIVE",
    scores: {
      momentumScore,
      consistencyScore,
      reproducibilityScore,
      nicheFitScore,
      monetizationScore,
      overallScore,
    },
    labels: ["rule_based_v0"],
    rationale: [
      `p90Views=${Math.round(p90)}, cadence/wk=${cadence}, samples=${rw.sampledVideoCount}`,
    ],
    riskFlags: p90 < 10_000 ? ["low_p90_views"] : [],
    topFormats: [],
  };
};
