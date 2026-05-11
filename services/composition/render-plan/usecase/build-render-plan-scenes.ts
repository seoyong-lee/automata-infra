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
import {
  mergePhraseParts,
  splitSubtitleIntoPhrases,
} from "./subtitle-phrase-parts";
import { tryBuildSubtitleSegmentsFromElevenLabs } from "./subtitle-segments-from-elevenlabs";

/** Snap timeline to whole frames so start/end/gap are not irrational (ASS + xfade + concat stay aligned). */
const snapTimelineToFps = (sec: number, fps: number): number => {
  if (!Number.isFinite(fps) || fps <= 0) {
    return Number(sec.toFixed(3));
  }
  if (!Number.isFinite(sec)) {
    return 0;
  }
  return Math.round(sec * fps) / fps;
};

const snapSceneDurationToFps = (sec: number, fps: number): number => {
  if (!Number.isFinite(fps) || fps <= 0) {
    return Math.max(0.1, sec);
  }
  const frames = Math.max(1, Math.round(sec * fps));
  return frames / fps;
};

const snapGapToFps = (sec: number, fps: number): number => {
  if (!Number.isFinite(sec) || sec <= 0) {
    return 0;
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    return sec;
  }
  const frames = Math.max(1, Math.round(sec * fps));
  return frames / fps;
};

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
  const n = parts.length;
  const minGapSec = Math.min(0.04, totalDurationSec / Math.max(2 * n, 1));
  const edges: number[] = new Array(n + 1);
  edges[0] = input.startSec;
  let acc = 0;
  for (let i = 1; i < n; i++) {
    acc += weights[i - 1]! / totalWeight;
    edges[i] = input.startSec + totalDurationSec * acc;
  }
  edges[n] = input.endSec;
  for (let i = 1; i < n; i++) {
    edges[i] = Math.max(edges[i]!, edges[i - 1]! + minGapSec);
  }
  for (let i = n - 1; i >= 1; i--) {
    edges[i] = Math.min(edges[i]!, edges[i + 1]! - minGapSec);
  }
  if (edges[1]! > edges[n - 1]! - 1e-9) {
    const step = totalDurationSec / n;
    for (let i = 1; i < n; i++) {
      edges[i] = input.startSec + step * i;
    }
    edges[n] = input.endSec;
  }
  return parts.map((part, index) => ({
    text: part,
    startSec: edges[index]!,
    endSec: edges[index + 1]!,
  }));
};

const resolveSubtitleSegmentsForScene = (input: {
  subtitle: string;
  narration?: string;
  startSec: number;
  endSec: number;
  voiceAsset?: RenderPlanVoiceAsset;
}): RenderPlanSubtitleSegment[] => {
  const doc = input.voiceAsset?.elevenLabsAlignment;
  if (doc) {
    const fromVendor = tryBuildSubtitleSegmentsFromElevenLabs({
      subtitle: input.subtitle,
      narration: input.narration,
      sceneStartSec: input.startSec,
      sceneEndSec: input.endSec,
      elevenLabsDocument: doc,
    });
    if (fromVendor?.length) {
      return fromVendor;
    }
  }
  return buildSubtitleSegments({
    subtitle: input.subtitle,
    startSec: input.startSec,
    endSec: input.endSec,
  });
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
    bgmMood: input.scene.bgmMood,
    sfx: input.scene.sfx,
    startTransition: input.scene.startTransition,
  };
};

export const buildRenderPlanScenes = (
  event: RenderPlanEvent,
  sceneGapSec = 0.3,
  timelineFps = 30,
): BuiltRenderPlanScenes => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const videoAssets = event.videoAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];
  const sceneCount = event.sceneJson.scenes.length;

  const scenes = event.sceneJson.scenes.map((scene, index) => {
    const alignedScene = alignSceneNarrationAndSubtitle(
      scene,
    ) as RenderPlanSceneInput;
    const startSec = snapTimelineToFps(cursorSec, timelineFps);
    const voiceAsset = voiceAssets.find(
      (asset) => asset.sceneId === alignedScene.sceneId,
    );
    const baseScene = buildRenderPlanScene({
      scene: alignedScene,
      index,
      sceneCount,
      startSec,
      sceneGapSec,
      imageAssets,
      videoAssets,
      voiceAssets,
    });
    const durationSec = snapSceneDurationToFps(
      baseScene.durationSec,
      timelineFps,
    );
    const endSec = snapTimelineToFps(startSec + durationSec, timelineFps);
    const gapAfterSec =
      index < sceneCount - 1 ? snapGapToFps(sceneGapSec, timelineFps) : 0;
    const subtitleSegments = resolveSubtitleSegmentsForScene({
      subtitle: alignedScene.subtitle,
      narration: alignedScene.narration,
      startSec,
      endSec,
      voiceAsset,
    });
    cursorSec = snapTimelineToFps(endSec + gapAfterSec, timelineFps);
    return {
      ...baseScene,
      startSec,
      endSec,
      durationSec,
      gapAfterSec,
      subtitleSegments,
    };
  });

  return {
    totalDurationSec: cursorSec,
    scenes,
  };
};
