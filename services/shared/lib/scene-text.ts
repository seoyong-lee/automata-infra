type SceneTextLike = {
  narration?: string | null;
  subtitle?: string | null;
  disableNarration?: boolean;
};

type SceneJsonLike<TScene extends SceneTextLike> = {
  scenes: TScene[];
};

const hasNarration = (value: string | null | undefined): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const alignSceneNarrationAndSubtitle = <TScene extends SceneTextLike>(
  scene: TScene,
): TScene => {
  if (scene.disableNarration || !hasNarration(scene.narration)) {
    return scene;
  }

  const narration = scene.narration.trim();
  return {
    ...scene,
    narration,
    subtitle: narration,
  };
};

export const alignSceneJsonNarrationAndSubtitle = <
  TScene extends SceneTextLike,
  TSceneJson extends SceneJsonLike<TScene>,
>(
  sceneJson: TSceneJson,
): TSceneJson => {
  return {
    ...sceneJson,
    scenes: sceneJson.scenes.map(alignSceneNarrationAndSubtitle),
  };
};
