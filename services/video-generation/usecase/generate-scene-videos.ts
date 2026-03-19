import { generateSceneVideo } from "../../shared/lib/providers/media/runway-video";

export const generateSceneVideos = async (input: {
  jobId: string;
  scenes: Array<{
    sceneId: number;
    videoPrompt: string;
  }>;
  secretId: string;
}): Promise<unknown[]> => {
  const videoAssets = [];

  for (const scene of input.scenes) {
    const asset = await generateSceneVideo({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.videoPrompt,
      secretId: input.secretId,
    });
    videoAssets.push(asset);
  }

  return videoAssets;
};
