type SceneInput = {
  sceneId: number;
  durationSec?: number;
  subtitle?: string;
};

const pickKey = (asset: unknown, key: string): string | null => {
  if (!asset || typeof asset !== "object") {
    return null;
  }
  const value = (asset as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

export const collectAssetRefs = (input: {
  scenes: SceneInput[];
  imageAssets?: unknown[];
  voiceAssets?: unknown[];
  videoAssets?: unknown[];
}) => {
  const imageAssets = input.imageAssets ?? [];
  const voiceAssets = input.voiceAssets ?? [];
  const videoAssets = input.videoAssets ?? [];

  return input.scenes.map((scene, index) => {
    return {
      sceneId: scene.sceneId,
      durationSec: scene.durationSec ?? 0,
      subtitle: scene.subtitle ?? "",
      imageS3Key: pickKey(imageAssets[index], "imageS3Key"),
      voiceS3Key: pickKey(voiceAssets[index], "voiceS3Key"),
      videoClipS3Key: pickKey(videoAssets[index], "videoClipS3Key"),
    };
  });
};
