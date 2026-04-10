import {
  generateSceneBytePlusVideo,
  generateSceneVideo,
} from "../../shared/lib/providers/media";
import { resolveSceneAiVideoPrompt } from "../../shared/lib/resolve-scene-ai-video-prompt";

type VideoAsset = Record<string, unknown>;

type GenerateSceneVideoFn = typeof generateSceneVideo;
type VideoProvider = "runway" | "byteplus";

const DEFAULT_VIDEO_SCENE_CONCURRENCY = 3;
const MAX_VIDEO_SCENE_CONCURRENCY = 12;

const resolveVideoSceneConcurrency = (): number => {
  const raw =
    process.env.VIDEO_GENERATION_SCENE_CONCURRENCY?.trim() ??
    process.env.BYTEPLUS_VIDEO_SCENE_CONCURRENCY?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n >= 1) {
    return Math.min(Math.floor(n), MAX_VIDEO_SCENE_CONCURRENCY);
  }
  return DEFAULT_VIDEO_SCENE_CONCURRENCY;
};

/** Run async tasks with fixed concurrency; preserves result order by index. */
const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) {
    return [];
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  const runWorker = async () => {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) {
        return;
      }
      results[i] = await worker(items[i] as T, i);
    }
  };
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

const resolveSceneVideoGenerator = (
  provider: VideoProvider | undefined,
): GenerateSceneVideoFn => {
  return provider === "byteplus"
    ? generateSceneBytePlusVideo
    : generateSceneVideo;
};

export const generateSceneVideos = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      videoPrompt?: string;
      imagePrompt?: string;
      targetDurationSec?: number;
      durationSec?: number;
      selectedImageS3Key?: string;
      selectedImageDataUri?: string;
    }>;
    secretId: string;
    provider?: VideoProvider;
  },
  deps: {
    generateSceneVideo?: GenerateSceneVideoFn;
  } = {},
): Promise<VideoAsset[]> => {
  const requestSceneVideo =
    deps.generateSceneVideo ?? resolveSceneVideoGenerator(input.provider);

  type SceneRow = (typeof input.scenes)[number];
  const workScenes: SceneRow[] = [];
  for (const scene of input.scenes) {
    if (resolveSceneAiVideoPrompt(scene)) {
      workScenes.push(scene);
    }
  }
  if (workScenes.length === 0) {
    return [];
  }

  const concurrency = resolveVideoSceneConcurrency();

  return mapWithConcurrency(workScenes, concurrency, async (scene) => {
    const prompt = resolveSceneAiVideoPrompt(scene) ?? "";
    const targetDurationSec =
      typeof scene.targetDurationSec === "number"
        ? scene.targetDurationSec
        : scene.durationSec;

    return requestSceneVideo({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt,
      targetDurationSec,
      selectedImageS3Key: scene.selectedImageS3Key,
      selectedImageDataUri: scene.selectedImageDataUri,
      secretId: input.secretId,
    });
  });
};
