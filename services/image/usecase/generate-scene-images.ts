import {
  generateSceneBytePlusImage,
  generateSceneImage,
} from "../../shared/lib/providers/media";

type ImageAsset = Record<string, unknown>;

type GenerateSceneImageFn = typeof generateSceneImage;
type ImageProvider = "openai" | "byteplus";

const resolveSceneImageGenerator = (
  provider: ImageProvider | undefined,
): GenerateSceneImageFn => {
  return provider === "byteplus"
    ? generateSceneBytePlusImage
    : generateSceneImage;
};

export const generateSceneImages = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      imagePrompt: string;
    }>;
    secretId: string;
    provider?: ImageProvider;
  },
  deps: {
    generateSceneImage?: GenerateSceneImageFn;
  } = {},
): Promise<ImageAsset[]> => {
  const imageAssets: ImageAsset[] = [];
  const requestSceneImage =
    deps.generateSceneImage ?? resolveSceneImageGenerator(input.provider);

  for (const scene of input.scenes) {
    const asset = await requestSceneImage({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      prompt: scene.imagePrompt,
      secretId: input.secretId,
    });
    imageAssets.push({
      ...asset,
      sceneId: scene.sceneId,
    });
  }

  return imageAssets;
};
