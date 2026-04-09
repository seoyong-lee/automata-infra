const trimSceneString = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

/** 씬 JSON·이벤트 등에서 `videoPrompt` / `imagePrompt`만 있으면 된다. */
export type SceneAiVideoPromptSource = {
  videoPrompt?: string | null | undefined;
  imagePrompt?: string | null | undefined;
};

/**
 * AI 비디오 API에 넣을 텍스트: `videoPrompt`가 있으면 우선, 없으면 `imagePrompt`로
 * 이미지→비디오(i2v)를 진행한다.
 */
export const resolveSceneAiVideoPrompt = (
  scene: SceneAiVideoPromptSource,
): string => {
  const vp = trimSceneString(scene.videoPrompt);
  if (vp.length > 0) {
    return vp;
  }
  return trimSceneString(scene.imagePrompt);
};

export const sceneHasAiVideoTextPrompt = (
  scene: SceneAiVideoPromptSource,
): boolean => resolveSceneAiVideoPrompt(scene).length > 0;
