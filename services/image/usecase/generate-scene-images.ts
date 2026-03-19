import { generateSceneImage } from "../../shared/lib/providers/media/openai-image";

export const generateSceneImages = async (input: {
  jobId: string;
  scenes: Array<{
    sceneId: number;
    imagePrompt: string;
  }>;
  secretId: string;
}): Promise<unknown[]> => {
  const imageAssets = [];

  for (const scene of input.scenes) {
    const asset = await generateSceneImage({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.imagePrompt,
      secretId: input.secretId,
    });
    imageAssets.push(asset);
  }

  return imageAssets;
};
