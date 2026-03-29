import type {
  SceneVisualNeed,
  SceneVisualSourceType,
} from "./contracts/canonical-io-schemas";
import type {
  SceneDefinition,
  SceneJson,
} from "../../../types/render/scene-json";

const DEFAULT_AVOID_TAGS = ["logo", "text", "watermark"];
const SEMANTIC_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "above",
  "across",
  "after",
  "along",
  "around",
  "atmosphere",
  "before",
  "camera",
  "cinematic",
  "close",
  "cold",
  "detail",
  "detailed",
  "dramatic",
  "frame",
  "gentle",
  "glow",
  "high",
  "in",
  "light",
  "lit",
  "low",
  "moonlit",
  "of",
  "pan",
  "push",
  "realism",
  "realistic",
  "shot",
  "slow",
  "still",
  "subtle",
  "the",
  "through",
  "toward",
  "with",
]);

const MOOD_KEYWORDS: Record<string, string[]> = {
  dark: ["dark", "midnight", "night", "shadow", "moonlit", "gloom"],
  eerie: ["eerie", "creepy", "haunted", "uncanny", "ghostly"],
  suspense: ["tense", "tension", "suspense", "ominous", "threat"],
  mysterious: ["mystery", "mysterious", "unknown", "silent", "whisper"],
  calm: ["calm", "quiet", "peaceful", "stillness", "still"],
  warm: ["warm", "sunlit", "golden", "cozy"],
  nostalgic: ["nostalgic", "memory", "old", "retro", "faded"],
  dramatic: ["dramatic", "intense", "epic", "storm"],
};

const MOTION_HINTS: Array<[pattern: RegExp, hint: string]> = [
  [/\bpush\b|\bpush[- ]in\b/, "slow_push_in"],
  [/\bdolly\b|\bdolly[- ]in\b/, "slow_dolly_in"],
  [/\bzoom\b/, "slow_zoom"],
  [/\bpan\b/, "slow_pan"],
  [/\btrack(?:ing)?\b/, "tracking_move"],
  [/\bdrift\b|\bfloating\b/, "slow_drift"],
];

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

export const normalizeSceneTag = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const collectSceneText = (scene: SceneDefinition): string => {
  return normalizeWhitespace(
    [
      scene.imagePrompt,
      scene.videoPrompt,
      scene.narration,
      scene.subtitle,
      scene.bgmMood,
      scene.storyBeat,
      scene.visualNeed?.semanticType,
      scene.visualNeed?.motionHint,
      ...(scene.visualNeed?.moodTags ?? []),
      ...(scene.sfx ?? []),
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );
};

const tokenize = (value: string): string[] => {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

export const deriveSceneSemanticTags = (scene: SceneDefinition): string[] => {
  const preferredText =
    scene.visualNeed?.semanticType ||
    scene.imagePrompt ||
    scene.videoPrompt ||
    scene.subtitle ||
    scene.narration;
  return Array.from(
    new Set(
      tokenize(preferredText).filter(
        (token) => !SEMANTIC_STOP_WORDS.has(token),
      ),
    ),
  ).slice(0, 4);
};

const deriveSemanticType = (scene: SceneDefinition): string => {
  const selected = deriveSceneSemanticTags(scene);
  if (selected.length > 0) {
    return selected.join("_");
  }
  return `scene_${scene.sceneId}`;
};

const deriveMoodTags = (scene: SceneDefinition): string[] => {
  const text = collectSceneText(scene).toLowerCase();
  const derived = new Set<string>();

  if (scene.bgmMood) {
    for (const token of tokenize(scene.bgmMood)) {
      if (token !== "bgm" && token !== "music" && token !== "ambient") {
        derived.add(token);
      }
    }
  }

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      derived.add(mood);
    }
  }

  if (derived.size === 0) {
    derived.add("dramatic");
  }

  return Array.from(derived).slice(0, 4);
};

const deriveMotionHint = (scene: SceneDefinition): string | undefined => {
  const text = normalizeWhitespace(
    `${scene.videoPrompt ?? ""} ${scene.imagePrompt}`,
  ).toLowerCase();
  for (const [pattern, hint] of MOTION_HINTS) {
    if (pattern.test(text)) {
      return hint;
    }
  }
  return undefined;
};

const resolveVisualTypePriority = (
  scene: SceneDefinition,
): SceneVisualSourceType[] => {
  if (scene.videoPrompt && scene.videoPrompt.trim().length > 0) {
    return [
      "pool_video",
      "stock_video",
      "pool_image",
      "stock_image",
      "ai_image",
      "ai_video",
      "title_card",
    ];
  }

  return [
    "pool_image",
    "stock_image",
    "pool_video",
    "stock_video",
    "ai_image",
    "ai_video",
    "title_card",
  ];
};

export const resolveDefaultSceneStoryBeat = (input: {
  scene: SceneDefinition;
  sceneIndex: number;
  sceneCount: number;
}): string => {
  const text = collectSceneText(input.scene).toLowerCase();
  if (input.sceneIndex === 0) {
    return "hook";
  }
  if (input.sceneIndex === input.sceneCount - 1) {
    return text.includes("reveal") || text.includes("truth")
      ? "reveal"
      : "payoff";
  }

  const progress = input.sceneIndex / Math.max(1, input.sceneCount - 1);
  if (progress < 0.34) {
    return "setup";
  }
  if (progress < 0.67) {
    return "build";
  }
  return "tension";
};

export const resolveDefaultSceneVisualNeed = (
  scene: SceneDefinition,
): SceneVisualNeed => {
  return {
    semanticType: deriveSemanticType(scene),
    moodTags: deriveMoodTags(scene),
    visualTypePriority: resolveVisualTypePriority(scene),
    motionHint: deriveMotionHint(scene),
    avoidTags: DEFAULT_AVOID_TAGS,
  };
};

export const applyDefaultSceneVisualMetadata = (
  sceneJson: SceneJson,
): SceneJson => {
  return {
    ...sceneJson,
    scenes: sceneJson.scenes.map((scene, index) => ({
      ...scene,
      storyBeat:
        scene.storyBeat ??
        resolveDefaultSceneStoryBeat({
          scene,
          sceneIndex: index,
          sceneCount: sceneJson.scenes.length,
        }),
      visualNeed: scene.visualNeed ?? resolveDefaultSceneVisualNeed(scene),
    })),
  };
};

export const buildSceneStockSearchPrompt = (
  scene: SceneDefinition,
  modality: "image" | "video",
): string => {
  const seed = normalizeWhitespace(
    [
      scene.visualNeed?.semanticType?.replace(/_/g, " "),
      ...(scene.visualNeed?.moodTags ?? []).slice(0, 2),
      modality === "video"
        ? scene.visualNeed?.motionHint?.replace(/_/g, " ")
        : "",
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );

  if (seed.length > 0) {
    return seed;
  }

  if (modality === "video" && scene.videoPrompt?.trim()) {
    return scene.videoPrompt.trim();
  }

  return scene.imagePrompt.trim();
};

export const deriveSceneAssetPoolTags = (
  scene: SceneDefinition,
): {
  visualTags: string[];
  moodTags: string[];
} => {
  const visualTags = Array.from(
    new Set(
      [
        ...deriveSceneSemanticTags(scene),
        ...(scene.visualNeed?.motionHint
          ? scene.visualNeed.motionHint
              .split("_")
              .map(normalizeSceneTag)
              .filter((tag) => tag.length > 0)
          : []),
      ]
        .map(normalizeSceneTag)
        .filter((tag) => tag.length > 0),
    ),
  );
  const moodTags = Array.from(
    new Set(
      (scene.visualNeed?.moodTags ?? deriveMoodTags(scene))
        .map(normalizeSceneTag)
        .filter((tag) => tag.length > 0),
    ),
  );

  return {
    visualTags,
    moodTags,
  };
};
