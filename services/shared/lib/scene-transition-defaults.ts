import type {
  SceneStartTransition,
  SceneStartTransitionType,
} from "./contracts/canonical-io-schemas";
import type { SceneDefinition, SceneJson } from "../../../types/render/scene-json";

const DARK_TRANSITION_KEYWORDS = [
  "dark",
  "night",
  "midnight",
  "shadow",
  "mystery",
  "tense",
  "fog",
  "mist",
  "storm",
  "thunder",
  "horror",
  "silent",
  "silence",
  "cold",
  "moonlit",
];

const BRIGHT_TRANSITION_KEYWORDS = [
  "bright",
  "light",
  "sunrise",
  "sunset",
  "glow",
  "dream",
  "dreamy",
  "heaven",
  "white",
  "snow",
  "sparkle",
  "hope",
  "soft",
];

const LEFT_TRANSITION_KEYWORDS = [
  "pan left",
  "track left",
  "move left",
  "slide left",
  "sweep left",
];
const RIGHT_TRANSITION_KEYWORDS = [
  "pan right",
  "track right",
  "move right",
  "slide right",
  "sweep right",
];
const UP_TRANSITION_KEYWORDS = [
  "pan up",
  "tilt up",
  "move up",
  "rise above",
  "ascend",
  "skyward",
];
const DOWN_TRANSITION_KEYWORDS = [
  "pan down",
  "tilt down",
  "move down",
  "descend",
  "drop below",
  "fall downward",
];
const REVEAL_TRANSITION_KEYWORDS = [
  "reveal",
  "opening",
  "opens",
  "unfold",
  "arrival",
  "enter",
];

const FALLBACK_TRANSITION_SEQUENCE: SceneStartTransitionType[] = [
  "dissolve",
  "smoothleft",
  "smoothright",
  "fade",
];

const DEFAULT_TRANSITION_DURATION_BY_TYPE: Record<
  Exclude<SceneStartTransitionType, "cut">,
  number
> = {
  fade: 0.45,
  dissolve: 0.45,
  fadeblack: 0.55,
  fadewhite: 0.5,
  wipeleft: 0.35,
  wiperight: 0.35,
  wipeup: 0.35,
  wipedown: 0.35,
  slideleft: 0.4,
  slideright: 0.4,
  slideup: 0.4,
  slidedown: 0.4,
  smoothleft: 0.45,
  smoothright: 0.45,
  smoothup: 0.45,
  smoothdown: 0.45,
};

const includesKeyword = (text: string, keywords: string[]): boolean => {
  return keywords.some((keyword) => text.includes(keyword));
};

const buildSceneTransitionText = (scene: SceneDefinition): string => {
  return [
    scene.narration,
    scene.subtitle,
    scene.storyBeat,
    scene.imagePrompt,
    scene.videoPrompt,
    scene.bgmMood,
    scene.visualNeed?.semanticType,
    scene.visualNeed?.motionHint,
    ...(scene.visualNeed?.moodTags ?? []),
    ...(Array.isArray(scene.sfx) ? scene.sfx : []),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
};

const toTimedTransition = (
  type: SceneStartTransitionType,
): SceneStartTransition => {
  if (type === "cut") {
    return { type };
  }
  return {
    type,
    durationSec: DEFAULT_TRANSITION_DURATION_BY_TYPE[type],
  };
};

const resolveDirectionalTransition = (
  text: string,
): SceneStartTransitionType | undefined => {
  if (includesKeyword(text, LEFT_TRANSITION_KEYWORDS)) {
    return "smoothleft";
  }
  if (includesKeyword(text, RIGHT_TRANSITION_KEYWORDS)) {
    return "smoothright";
  }
  if (includesKeyword(text, UP_TRANSITION_KEYWORDS)) {
    return "smoothup";
  }
  if (includesKeyword(text, DOWN_TRANSITION_KEYWORDS)) {
    return "smoothdown";
  }
  return undefined;
};

export const resolveDefaultSceneStartTransition = (input: {
  scene: SceneDefinition;
  sceneIndex: number;
}): SceneStartTransition => {
  if (input.sceneIndex === 0) {
    return { type: "cut" };
  }

  const text = buildSceneTransitionText(input.scene);
  if (includesKeyword(text, DARK_TRANSITION_KEYWORDS)) {
    return toTimedTransition("fadeblack");
  }
  if (includesKeyword(text, BRIGHT_TRANSITION_KEYWORDS)) {
    return toTimedTransition("fadewhite");
  }
  const directional = resolveDirectionalTransition(text);
  if (directional) {
    return toTimedTransition(directional);
  }
  if (includesKeyword(text, REVEAL_TRANSITION_KEYWORDS)) {
    return toTimedTransition("wipeleft");
  }
  return toTimedTransition(
    FALLBACK_TRANSITION_SEQUENCE[
      (input.sceneIndex - 1) % FALLBACK_TRANSITION_SEQUENCE.length
    ] ?? "dissolve",
  );
};

export const applyDefaultSceneStartTransitions = (
  sceneJson: SceneJson,
): SceneJson => {
  return {
    ...sceneJson,
    scenes: sceneJson.scenes.map((scene, index) => ({
      ...scene,
      startTransition:
        scene.startTransition ??
        resolveDefaultSceneStartTransition({
          scene,
          sceneIndex: index,
        }),
    })),
  };
};
