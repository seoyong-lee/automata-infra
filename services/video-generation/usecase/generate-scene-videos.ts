import { generateSceneVideo } from "../../shared/lib/providers/media/runway-video";

type VideoAsset = Record<string, unknown>;

type GenerateSceneVideoFn = typeof generateSceneVideo;

export const generateSceneVideos = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      videoPrompt?: string;
    }>;
    secretId: string;
  },
  deps: {
    generateSceneVideo?: GenerateSceneVideoFn;
  } = {},
): Promise<VideoAsset[]> => {
  const videoAssets: VideoAsset[] = [];
  const requestSceneVideo = deps.generateSceneVideo ?? generateSceneVideo;

  for (const scene of input.scenes) {
    if (!scene.videoPrompt) {
      continue;
    }

    const asset = await requestSceneVideo({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.videoPrompt,
      secretId: input.secretId,
    });
    videoAssets.push(asset);
  }

  return videoAssets;
};
