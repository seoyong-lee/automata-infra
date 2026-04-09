import { estimateResolvedVoiceDurationSec } from "../../../shared/lib/providers/media/elevenlabs-voice";
import { alignSceneNarrationAndSubtitle } from "../../../shared/lib/scene-text";
import type {
  RenderPlanScene,
  RenderPlanSubtitleSegment,
} from "../../../../types/render/render-plan";
import type {
  BuiltRenderPlanScenes,
  RenderPlanEvent,
  RenderPlanSceneInput,
  RenderPlanVoiceAsset,
} from "../types";

/** Avoid dozens of micro-phrases that break timing on short scenes. */
const MAX_PHRASE_SEGMENTS = 14;

const resolveSceneDurationSec = (
  scene: RenderPlanSceneInput,
  voiceAsset?: RenderPlanVoiceAsset,
): number => {
  const plannedDurationSec = Math.max(0.1, scene.durationSec);
  if (scene.disableNarration) {
    return plannedDurationSec;
  }
  const actualVoiceDurationSec =
    typeof voiceAsset?.voiceDurationSec === "number" &&
    Number.isFinite(voiceAsset.voiceDurationSec)
      ? voiceAsset.voiceDurationSec
      : undefined;
  /** Natural-speed estimate so plan window ≥ typical TTS (not max-speed lower bound). */
  const estimatedNarrationSec = estimateResolvedVoiceDurationSec(
    scene.narration,
    1,
  );
  const minimumNarrationDurationSec = actualVoiceDurationSec
    ? actualVoiceDurationSec
    : estimatedNarrationSec;
  return Math.max(plannedDurationSec, minimumNarrationDurationSec);
};

/** Heavier Hangul ≈ more TTS time than raw character count. */
const estimateSpeechTimingUnits = (part: string): number => {
  let u = 0;
  for (const char of part.replace(/\s+/g, "")) {
    if (/[\uAC00-\uD7A3]/.test(char)) {
      u += 1.12;
    } else if (/[\u3131-\u318E]/.test(char)) {
      u += 0.4;
    } else if (/[A-Za-z]/.test(char)) {
      u += 0.42;
    } else if (/[0-9]/.test(char)) {
      u += 0.45;
    } else {
      u += 0.5;
    }
  }
  return Math.max(1, u);
};

const splitLongSubtitleByWords = (normalized: string): string[] => {
  const bySpace = normalized.split(/\s+/).filter((w) => w.length > 0);
  if (bySpace.length <= 6) {
    return [];
  }
  const out: string[] = [];
  let buf = "";
  for (const w of bySpace) {
    const next = buf ? `${buf} ${w}` : w;
    if (next.length > 44 && buf) {
      out.push(buf);
      buf = w;
    } else {
      buf = next;
    }
  }
  if (buf) {
    out.push(buf);
  }
  return out.length > 1 ? out : [];
};

const splitSubtitleIntoPhrases = (subtitle: string): string[] => {
  const normalized = subtitle.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const sentenceMatches = normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g);
  const sentences = (sentenceMatches ?? [normalized])
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (sentences.length > 1) {
    return sentences;
  }
  const byClause = normalized
    .split(/[,;，、:]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (byClause.length > 1) {
    return byClause;
  }
  if (normalized.length > 52) {
    const wordChunks = splitLongSubtitleByWords(normalized);
    if (wordChunks.length > 1) {
      return wordChunks;
    }
  }
  return [normalized];
};

const mergePhraseParts = (parts: string[]): string[] => {
  if (parts.length <= MAX_PHRASE_SEGMENTS) {
    return parts;
  }
  const merged: string[] = [];
  const groupSize = Math.ceil(parts.length / MAX_PHRASE_SEGMENTS);
  for (let i = 0; i < parts.length; i += groupSize) {
    merged.push(parts.slice(i, i + groupSize).join(" "));
  }
  return merged;
};

/** Phrase-level segments; timeline is a strict partition of [startSec, endSec] by speech-weight. */
const buildSubtitleSegments = (input: {
  subtitle: string;
  startSec: number;
  endSec: number;
}): RenderPlanSubtitleSegment[] => {
  let parts = splitSubtitleIntoPhrases(input.subtitle);
  parts = mergePhraseParts(parts);
  if (parts.length === 0 || input.endSec <= input.startSec) {
    return [];
  }
  if (parts.length === 1) {
    return [
      {
        text: parts[0]!,
        startSec: input.startSec,
        endSec: input.endSec,
      },
    ];
  }

  const totalDurationSec = Math.max(0.001, input.endSec - input.startSec);
  const weights = parts.map((part) => estimateSpeechTimingUnits(part));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const edges: number[] = [input.startSec];
  let acc = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    acc += weights[i]! / totalWeight;
    edges.push(input.startSec + totalDurationSec * acc);
  }
  edges.push(input.endSec);
  return parts.map((part, index) => ({
    text: part,
    startSec: edges[index]!,
    endSec: edges[index + 1]!,
  }));
};

const buildRenderPlanScene = (input: {
  scene: RenderPlanSceneInput;
  index: number;
  sceneCount: number;
  startSec: number;
  sceneGapSec: number;
  imageAssets: NonNullable<RenderPlanEvent["imageAssets"]>;
  videoAssets: NonNullable<RenderPlanEvent["videoAssets"]>;
  voiceAssets: NonNullable<RenderPlanEvent["voiceAssets"]>;
}): RenderPlanScene => {
  const imageAsset = input.imageAssets.find(
    (asset) => asset.sceneId === input.scene.sceneId,
  );
  const voiceAsset = input.voiceAssets.find(
    (asset) => asset.sceneId === input.scene.sceneId,
  );
  const videoAsset = input.videoAssets.find(
    (asset) => asset.sceneId === input.scene.sceneId,
  );
  const sceneDurationSec = resolveSceneDurationSec(input.scene, voiceAsset);
  const endSec = input.startSec + sceneDurationSec;
  const gapAfterSec =
    input.index < input.sceneCount - 1 ? input.sceneGapSec : 0;

  return {
    sceneId: input.scene.sceneId,
    startSec: input.startSec,
    endSec,
    durationSec: sceneDurationSec,
    gapAfterSec,
    ...(imageAsset?.imageS3Key ? { imageS3Key: imageAsset.imageS3Key } : {}),
    ...(videoAsset?.videoClipS3Key
      ? { videoClipS3Key: videoAsset.videoClipS3Key }
      : {}),
    ...(voiceAsset?.voiceS3Key ? { voiceS3Key: voiceAsset.voiceS3Key } : {}),
    ...(typeof voiceAsset?.voiceDurationSec === "number"
      ? { voiceDurationSec: voiceAsset.voiceDurationSec }
      : {}),
    disableNarration: input.scene.disableNarration,
    subtitle: input.scene.subtitle,
    subtitleSegments: buildSubtitleSegments({
      subtitle: input.scene.subtitle,
      startSec: input.startSec,
      endSec,
    }),
    bgmMood: input.scene.bgmMood,
    sfx: input.scene.sfx,
    startTransition: input.scene.startTransition,
  };
};

export const buildRenderPlanScenes = (
  event: RenderPlanEvent,
  sceneGapSec = 0.5,
): BuiltRenderPlanScenes => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const videoAssets = event.videoAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];

  const scenes = event.sceneJson.scenes.map((scene, index) => {
    const alignedScene = alignSceneNarrationAndSubtitle(
      scene,
    ) as RenderPlanSceneInput;
    const builtScene = buildRenderPlanScene({
      scene: alignedScene,
      index,
      sceneCount: event.sceneJson.scenes.length,
      startSec: cursorSec,
      sceneGapSec,
      imageAssets,
      videoAssets,
      voiceAssets,
    });
    cursorSec = builtScene.endSec + builtScene.gapAfterSec;
    return builtScene;
  });

  return {
    totalDurationSec: cursorSec,
    scenes,
  };
};
