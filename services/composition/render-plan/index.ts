/* eslint-disable max-lines */
import { Handler } from "aws-lambda";
import { parseBuffer } from "music-metadata";
import {
  getBufferFromS3,
  getJsonFromS3,
  putJsonToS3,
} from "../../shared/lib/aws/runtime";
import {
  type JobRenderSettings,
  parseContentBrief,
  parseJobBriefInput,
} from "../../shared/lib/contracts/canonical-io-schemas";
import type { ResolvedPolicy } from "../../shared/lib/contracts/content-presets";
import { estimateMinimumVoiceDurationSec } from "../../shared/lib/providers/media/elevenlabs-voice";
import { alignSceneNarrationAndSubtitle } from "../../shared/lib/scene-text";
import {
  getJobMeta,
  listSceneAssets,
  putRenderArtifact,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import type {
  RenderPlan,
  RenderPlanCanvas,
  RenderPlanOverlay,
  RenderPlanScene,
  RenderPlanSubtitleStyle,
} from "../../../types/render/render-plan";

type RenderPlanEvent = {
  jobId: string;
  sceneJson: {
    videoTitle: string;
    language: string;
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      narration: string;
      disableNarration?: boolean;
      subtitle: string;
      bgmMood?: string;
      sfx?: string[];
    }>;
  };
  imageAssets?: Array<{
    sceneId: number;
    imageS3Key?: string;
  }>;
  videoAssets?: Array<{
    sceneId: number;
    videoClipS3Key?: string;
  }>;
  voiceAssets?: Array<{
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
  }>;
  overlays?: RenderPlanOverlay[];
};

const DEFAULT_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1920,
  },
  fps: 30,
} as const;
const SQUARE_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1080,
  },
  fps: 30,
} as const;
const PORTRAIT_4X5_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1350,
  },
  fps: 30,
} as const;
const LANDSCAPE_OUTPUT = {
  format: "mp4",
  size: {
    width: 1920,
    height: 1080,
  },
  fps: 30,
} as const;
const DEFAULT_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  fontFamily: "Clear Sans",
  fontSize: 32,
  lineHeight: 1,
  opacity: 1,
  color: "#000000",
  strokeColor: "#ffffff",
  strokeWidth: 2,
  position: "center",
  offset: {
    x: -0.019,
    y: 0,
  },
} as const;
const BOLD_CAPTION_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 42,
  color: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 3,
  position: "bottom",
  offset: {
    x: 0,
    y: -0.02,
  },
};
const MINIMAL_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 26,
  strokeWidth: 1,
  position: "bottom",
  offset: {
    x: 0,
    y: 0.01,
  },
};
const DOCUMENTARY_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 34,
  color: "#FFFFFF",
  strokeColor: "#111111",
  strokeWidth: 2,
  position: "bottom",
};
const DEFAULT_CANVAS: RenderPlanCanvas = {
  backgroundColor: "#000000",
  videoScale: 1,
};
const subtitleStyleByPreset: Record<string, RenderPlanSubtitleStyle> = {
  "bold-caption-news": BOLD_CAPTION_SUBTITLE_STYLE,
  "minimal-quote": MINIMAL_SUBTITLE_STYLE,
  "documentary-lower-third": DOCUMENTARY_SUBTITLE_STYLE,
};

type RenderPolicyConfig = {
  output: RenderPlan["output"];
  canvas: RenderPlanCanvas;
  previewMaxDurationSec: number;
  subtitles: RenderPlan["subtitles"];
  sceneGapSec: number;
  defaultOverlays: RenderPlanOverlay[];
};

type StoredRenderInputs = {
  resolvedPolicy?: ResolvedPolicy;
  renderSettings?: JobRenderSettings;
};

type RenderPlanSceneInput = RenderPlanEvent["sceneJson"]["scenes"][number];
type RenderPlanVoiceAsset = NonNullable<RenderPlanEvent["voiceAssets"]>[number];

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

export const buildRenderPlanScenes = (
  event: RenderPlanEvent,
  sceneGapSec = 0.5,
): { totalDurationSec: number; scenes: RenderPlanScene[] } => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const videoAssets = event.videoAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];

  const scenes = event.sceneJson.scenes.map((scene, index) => {
    const alignedScene = alignSceneNarrationAndSubtitle(scene);
    const imageAsset = imageAssets.find(
      (asset) => asset.sceneId === alignedScene.sceneId,
    );
    const voiceAsset = voiceAssets.find(
      (asset) => asset.sceneId === alignedScene.sceneId,
    );
    const videoAsset = videoAssets.find(
      (asset) => asset.sceneId === alignedScene.sceneId,
    );
    const sceneDurationSec = resolveSceneDurationSec(alignedScene, voiceAsset);
    const startSec = cursorSec;
    const endSec = startSec + sceneDurationSec;
    const gapAfterSec =
      index < event.sceneJson.scenes.length - 1 ? sceneGapSec : 0;
    cursorSec = endSec + gapAfterSec;

    return {
      sceneId: alignedScene.sceneId,
      startSec,
      endSec,
      durationSec: sceneDurationSec,
      gapAfterSec,
      imageS3Key: imageAsset?.imageS3Key,
      videoClipS3Key: videoAsset?.videoClipS3Key,
      voiceS3Key: voiceAsset?.voiceS3Key,
      voiceDurationSec: voiceAsset?.voiceDurationSec,
      disableNarration: alignedScene.disableNarration,
      subtitle: alignedScene.subtitle,
      bgmMood: alignedScene.bgmMood,
      sfx: alignedScene.sfx,
    };
  });

  return {
    totalDurationSec: cursorSec,
    scenes,
  };
};

const resolveStoredRenderInputs = async (
  jobId: string,
): Promise<StoredRenderInputs> => {
  const job = await getJobMeta(jobId);
  if (!job) {
    return {};
  }
  if (job.jobBriefS3Key) {
    const payload = await getJsonFromS3(job.jobBriefS3Key);
    if (payload) {
      const parsed = parseJobBriefInput(payload);
      return {
        resolvedPolicy: parsed.resolvedPolicy,
        renderSettings: parsed.renderSettings,
      };
    }
  }
  if (job.contentBriefS3Key) {
    const payload = await getJsonFromS3(job.contentBriefS3Key);
    if (payload) {
      const parsed = parseContentBrief(payload);
      if (parsed.resolvedPolicy) {
        return {
          resolvedPolicy: parsed.resolvedPolicy,
        };
      }
    }
  }
  return {};
};

const resolveOutputByPlatformPreset = (
  platformPreset?: string,
): RenderPlan["output"] => {
  if (platformPreset === "1:1") {
    return SQUARE_OUTPUT;
  }
  if (platformPreset === "4:5") {
    return PORTRAIT_4X5_OUTPUT;
  }
  if (platformPreset === "16:9") {
    return LANDSCAPE_OUTPUT;
  }
  return DEFAULT_OUTPUT;
};

const resolveSubtitleStyle = (
  resolvedPolicy?: ResolvedPolicy,
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  const preset =
    renderSettings?.subtitleStylePreset ?? resolvedPolicy?.subtitleStylePreset;
  if (preset && subtitleStyleByPreset[preset]) {
    return subtitleStyleByPreset[preset];
  }
  if (resolvedPolicy?.format === "cinematic-visual") {
    return MINIMAL_SUBTITLE_STYLE;
  }
  if (resolvedPolicy?.format === "template-short") {
    return BOLD_CAPTION_SUBTITLE_STYLE;
  }
  return DEFAULT_SUBTITLE_STYLE;
};

const resolveSubtitlePosition = (
  style: RenderPlanSubtitleStyle,
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  if (!renderSettings?.subtitlePosition) {
    return style;
  }
  return {
    ...style,
    position: renderSettings.subtitlePosition,
  };
};

const resolveSceneGapSec = (resolvedPolicy?: ResolvedPolicy): number => {
  const layoutMode = resolvedPolicy?.capabilities.layoutMode;
  if (layoutMode === "template") {
    return 0.2;
  }
  if (layoutMode === "still-motion") {
    return 0.1;
  }
  if (layoutMode === "cinematic") {
    return 0.35;
  }
  return 0.5;
};

const resolvePreviewMaxDurationSec = (
  resolvedPolicy?: ResolvedPolicy,
): number => {
  if (resolvedPolicy?.duration === "long") {
    return 20;
  }
  if (resolvedPolicy?.format === "cinematic-visual") {
    return 8;
  }
  if (resolvedPolicy?.format === "template-short") {
    return 10;
  }
  return 12;
};

const buildDefaultOverlays = (
  event: RenderPlanEvent,
  resolvedPolicy?: ResolvedPolicy,
): RenderPlanOverlay[] => {
  if (
    !resolvedPolicy?.capabilities.supportsOverlayTemplate ||
    resolvedPolicy.capabilities.layoutMode !== "template"
  ) {
    return [];
  }

  return [
    {
      overlayId: "title-template",
      type: "text",
      text: event.sceneJson.videoTitle,
      placement: {
        x: 0.06,
        y: 0.05,
        width: 0.88,
        height: 0.12,
      },
      style: {
        fontFamily: "Clear Sans",
        fontSize: 28,
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 2,
        align: "center",
      },
      startSec: 0,
      endSec: 4,
      zIndex: 5,
    },
  ];
};

const resolveCanvas = (
  renderSettings?: JobRenderSettings,
): RenderPlanCanvas => {
  return {
    backgroundColor:
      renderSettings?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    videoScale: renderSettings?.videoScale ?? DEFAULT_CANVAS.videoScale,
  };
};

const resolveRenderPolicyConfig = (
  event: RenderPlanEvent,
  input: StoredRenderInputs = {},
): RenderPolicyConfig => {
  const { resolvedPolicy, renderSettings } = input;
  const output = resolveOutputByPlatformPreset(
    resolvedPolicy?.primaryPlatformPreset,
  );
  const subtitleStyle = resolveSubtitlePosition(
    resolveSubtitleStyle(resolvedPolicy, renderSettings),
    renderSettings,
  );
  const defaultBurnIn =
    resolvedPolicy?.capabilities.layoutMode === "template" ||
    resolvedPolicy?.capabilities.layoutMode === "still-motion";
  return {
    output,
    canvas: resolveCanvas(renderSettings),
    previewMaxDurationSec: resolvePreviewMaxDurationSec(resolvedPolicy),
    subtitles: {
      burnIn: renderSettings?.subtitleEnabled ?? defaultBurnIn,
      format: "ass",
      style: subtitleStyle,
    },
    sceneGapSec: resolveSceneGapSec(resolvedPolicy),
    defaultOverlays: buildDefaultOverlays(event, resolvedPolicy),
  };
};

const persistRenderPlan = async (
  jobId: string,
  renderPlan: { outputKey: string },
): Promise<void> => {
  await putJsonToS3(renderPlan.outputKey, renderPlan);
  await putRenderArtifact(jobId, {
    renderPlanS3Key: renderPlan.outputKey,
    createdAt: new Date().toISOString(),
  });
  await updateJobMeta(
    jobId,
    {
      renderPlanS3Key: renderPlan.outputKey,
    },
    "RENDER_PLAN_READY",
  );
};

const resolveStoredVoiceDurationSec = async (
  voiceS3Key?: string,
): Promise<number | undefined> => {
  if (!voiceS3Key) {
    return undefined;
  }
  const object = await getBufferFromS3(voiceS3Key);
  if (!object) {
    return undefined;
  }
  try {
    const metadata = await parseBuffer(object.buffer, {
      mimeType: object.contentType ?? "audio/mpeg",
    });
    const durationSec = metadata.format.duration;
    return typeof durationSec === "number" && Number.isFinite(durationSec)
      ? durationSec
      : undefined;
  } catch {
    return undefined;
  }
};

const resolveRenderPlanAssets = async (
  event: RenderPlanEvent,
  sceneAssets: Awaited<ReturnType<typeof listSceneAssets>>,
) => {
  const imageAssets =
    event.imageAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key:
        typeof scene.imageS3Key === "string" ? scene.imageS3Key : undefined,
    }));
  const voiceAssets = event.voiceAssets
    ? await Promise.all(
        event.voiceAssets.map(async (scene) => ({
          ...scene,
          voiceDurationSec:
            (await resolveStoredVoiceDurationSec(scene.voiceS3Key)) ??
            scene.voiceDurationSec,
        })),
      )
    : await Promise.all(
        sceneAssets.map(async (scene) => {
          const voiceS3Key =
            typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : undefined;
          return {
            sceneId: scene.sceneId,
            voiceS3Key,
            voiceDurationSec:
              (await resolveStoredVoiceDurationSec(voiceS3Key)) ??
              (typeof scene.voiceDurationSec === "number"
                ? scene.voiceDurationSec
                : undefined),
          };
        }),
      );
  const videoAssets =
    event.videoAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      videoClipS3Key:
        typeof scene.videoClipS3Key === "string"
          ? scene.videoClipS3Key
          : undefined,
    }));
  return { imageAssets, voiceAssets, videoAssets };
};

const resolveSoundtrackMood = (event: RenderPlanEvent): string | undefined => {
  return event.sceneJson.scenes.find(
    (scene) =>
      typeof scene.bgmMood === "string" && scene.bgmMood.trim().length > 0,
  )?.bgmMood;
};

export const buildRenderPlan = (
  event: RenderPlanEvent,
  builtScenes: ReturnType<typeof buildRenderPlanScenes>,
  config: RenderPolicyConfig = resolveRenderPolicyConfig(event),
): RenderPlan => {
  return {
    renderEngine: "ffmpeg-fargate",
    videoTitle: event.sceneJson.videoTitle,
    language: event.sceneJson.language,
    output: config.output,
    canvas: config.canvas,
    preview: {
      enabled: true,
      maxDurationSec: config.previewMaxDurationSec,
    },
    subtitles: config.subtitles,
    totalDurationSec: builtScenes.totalDurationSec,
    scenes: builtScenes.scenes,
    overlays:
      event.overlays && event.overlays.length > 0
        ? event.overlays
        : config.defaultOverlays,
    soundtrackMood: resolveSoundtrackMood(event),
    outputKey: `render-plans/${event.jobId}/render-plan.json`,
  };
};

export const run: Handler<
  RenderPlanEvent,
  RenderPlanEvent & { renderPlan: unknown; status: string }
> = async (event) => {
  const sceneAssets = await listSceneAssets(event.jobId);
  const storedInputs = await resolveStoredRenderInputs(event.jobId);
  const config = resolveRenderPolicyConfig(event, storedInputs);
  const { imageAssets, voiceAssets, videoAssets } =
    await resolveRenderPlanAssets(event, sceneAssets);
  const builtScenes = buildRenderPlanScenes(
    {
      ...event,
      imageAssets,
      videoAssets,
      voiceAssets,
    },
    config.sceneGapSec,
  );
  const renderPlan = buildRenderPlan(event, builtScenes, config);

  await persistRenderPlan(event.jobId, renderPlan);

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
