import { estimateMinimumVoiceDurationSec } from "../../../shared/lib/providers/media/elevenlabs-voice";
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

const MIN_SUBTITLE_SEGMENT_DURATION_SEC = 0.45;

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
  const minimumNarrationDurationSec = actualVoiceDurationSec
    ? actualVoiceDurationSec
    : estimateMinimumVoiceDurationSec(scene.narration);
  return Math.max(plannedDurationSec, minimumNarrationDurationSec);
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
  return normalized
    .split(/[,;:]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const buildSubtitleSegments = (input: {
  subtitle: string;
  startSec: number;
  endSec: number;
}): RenderPlanSubtitleSegment[] => {
  const parts = splitSubtitleIntoPhrases(input.subtitle);
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

  const totalDurationSec = input.endSec - input.startSec;
  const weights = parts.map((part) =>
    Math.max(1, part.replace(/\s+/g, "").length),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursorSec = input.startSec;

  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const proportionalDurationSec =
      (totalDurationSec * weights[index]!) / totalWeight;
    const remainingSec = input.endSec - cursorSec;
    const segmentDurationSec = isLast
      ? remainingSec
      : Math.min(
          remainingSec,
          Math.max(
            MIN_SUBTITLE_SEGMENT_DURATION_SEC,
            Math.min(proportionalDurationSec, remainingSec),
          ),
        );
    const segment = {
      text: part,
      startSec: cursorSec,
      endSec: isLast
        ? input.endSec
        : Math.min(input.endSec, cursorSec + segmentDurationSec),
    };
    cursorSec = segment.endSec;
    return segment;
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
