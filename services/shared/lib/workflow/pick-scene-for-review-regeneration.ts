import type { SceneJson } from "../../../../types/render/scene-json";

type SceneRow = SceneJson["scenes"][number];

/**
 * Step Functions가 `reviewDecision`에 실어 보낸 `targetSceneId`로 `sceneJson`에서 한 씬만 고른다.
 * 없거나 못 찾으면 `undefined`(호출부에서 전체 씬 폴백 또는 에러).
 */
export const pickSceneByReviewTarget = (
  event: {
    reviewDecision?: { targetSceneId?: number };
    sceneJson?: SceneJson;
  },
): SceneRow | undefined => {
  const id = event.reviewDecision?.targetSceneId;
  if (typeof id !== "number" || !Number.isInteger(id)) {
    return undefined;
  }
  return event.sceneJson?.scenes.find((s) => s.sceneId === id);
};
