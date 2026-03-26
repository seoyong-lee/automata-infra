import {
  generateSceneBytePlusVideo,
  generateSceneVideo,
} from "../../shared/lib/providers/media";

type VideoAsset = Record<string, unknown>;

type GenerateSceneVideoFn = typeof generateSceneVideo;
type VideoProvider = "runway" | "byteplus";

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
  const videoAssets: VideoAsset[] = [];
  const requestSceneVideo =
    deps.generateSceneVideo ?? resolveSceneVideoGenerator(input.provider);

  for (const scene of input.scenes) {
    if (!scene.videoPrompt) {
      continue;
    }
    const targetDurationSec =
      typeof scene.targetDurationSec === "number"
        ? scene.targetDurationSec
        : scene.durationSec;

    const asset = await requestSceneVideo({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.videoPrompt,
      targetDurationSec,
      selectedImageS3Key: scene.selectedImageS3Key,
      selectedImageDataUri: scene.selectedImageDataUri,
      secretId: input.secretId,
    });
    videoAssets.push(asset);
  }

  return videoAssets;
};
