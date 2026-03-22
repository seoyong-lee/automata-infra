/* eslint-disable max-lines */
import { Handler } from "aws-lambda";
import { parseBuffer } from "music-metadata";
import { getBufferFromS3, putJsonToS3 } from "../../shared/lib/aws/runtime";
import { estimateMinimumVoiceDurationSec } from "../../shared/lib/providers/media/elevenlabs-voice";
import {
  listSceneAssets,
  putRenderArtifact,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

type RenderPlanEvent = {
  jobId: string;
  sceneJson: {
    videoTitle: string;
    language: string;
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      narration: string;
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
};

const SCENE_GAP_SEC = 0.5;
const DEFAULT_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1920,
  },
  fps: 30,
} as const;
const DEFAULT_SUBTITLE_STYLE = {
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
type RenderPlanSceneInput = RenderPlanEvent["sceneJson"]["scenes"][number];
type RenderPlanVoiceAsset = NonNullable<RenderPlanEvent["voiceAssets"]>[number];

const resolveSceneDurationSec = (
  scene: RenderPlanSceneInput,
  voiceAsset?: RenderPlanVoiceAsset,
): number => {
  const plannedDurationSec = Math.max(0.1, scene.durationSec);
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
): { totalDurationSec: number; scenes: Array<Record<string, unknown>> } => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const videoAssets = event.videoAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];

  const scenes = event.sceneJson.scenes.map((scene, index) => {
    const imageAsset = imageAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const voiceAsset = voiceAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const videoAsset = videoAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const sceneDurationSec = resolveSceneDurationSec(scene, voiceAsset);
    const startSec = cursorSec;
    const endSec = startSec + sceneDurationSec;
    const gapAfterSec =
      index < event.sceneJson.scenes.length - 1 ? SCENE_GAP_SEC : 0;
    cursorSec = endSec + gapAfterSec;

    return {
      sceneId: scene.sceneId,
      startSec,
      endSec,
      durationSec: sceneDurationSec,
      gapAfterSec,
      imageS3Key: imageAsset?.imageS3Key,
      videoClipS3Key: videoAsset?.videoClipS3Key,
      voiceS3Key: voiceAsset?.voiceS3Key,
      voiceDurationSec: voiceAsset?.voiceDurationSec,
      subtitle: scene.subtitle,
      bgmMood: scene.bgmMood,
      sfx: scene.sfx,
    };
  });

  return {
    totalDurationSec: cursorSec,
    scenes,
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
) => {
  return {
    videoTitle: event.sceneJson.videoTitle,
    language: event.sceneJson.language,
    output: DEFAULT_OUTPUT,
    preview: {
      enabled: true,
      maxDurationSec: 12,
    },
    subtitles: {
      burnIn: false,
      format: "ass",
      style: DEFAULT_SUBTITLE_STYLE,
    },
    totalDurationSec: builtScenes.totalDurationSec,
    scenes: builtScenes.scenes,
    soundtrackMood: resolveSoundtrackMood(event),
    outputKey: `render-plans/${event.jobId}/render-plan.json`,
  };
};

export const run: Handler<
  RenderPlanEvent,
  RenderPlanEvent & { renderPlan: unknown; status: string }
> = async (event) => {
  const sceneAssets = await listSceneAssets(event.jobId);
  const { imageAssets, voiceAssets, videoAssets } =
    await resolveRenderPlanAssets(event, sceneAssets);
  const builtScenes = buildRenderPlanScenes({
    ...event,
    imageAssets,
    videoAssets,
    voiceAssets,
  });
  const renderPlan = buildRenderPlan(event, builtScenes);

  await persistRenderPlan(event.jobId, renderPlan);

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
