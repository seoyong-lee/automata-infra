import { generateSceneImage } from "../../shared/lib/providers/media/openai-image";

type ImageAsset = Record<string, unknown>;

type GenerateSceneImageFn = typeof generateSceneImage;

export const generateSceneImages = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      imagePrompt: string;
    }>;
    secretId: string;
  },
  deps: {
    generateSceneImage?: GenerateSceneImageFn;
  } = {},
): Promise<ImageAsset[]> => {
  const imageAssets: ImageAsset[] = [];
  const requestSceneImage = deps.generateSceneImage ?? generateSceneImage;

  for (const scene of input.scenes) {
    const asset = await requestSceneImage({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.imagePrompt,
      secretId: input.secretId,
    });
    imageAssets.push(asset);
  }

  return imageAssets;
};
