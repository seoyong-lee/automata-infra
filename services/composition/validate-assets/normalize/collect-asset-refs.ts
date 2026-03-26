type SceneInput = {
  sceneId: number;
  durationSec?: number;
  narration?: string;
  disableNarration?: boolean;
  subtitle?: string;
};

const pickKey = (asset: unknown, key: string): string | null => {
  if (!asset || typeof asset !== "object") {
    return null;
  }
  const value = (asset as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

const pickSceneId = (asset: unknown): number | null => {
  if (!asset || typeof asset !== "object") {
    return null;
  }
  const value = (asset as Record<string, unknown>).sceneId;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const buildAssetLookup = (assets: unknown[]) => {
  const bySceneId = new Map<number, unknown>();
  const unscopedAssets: unknown[] = [];

  for (const asset of assets) {
    const sceneId = pickSceneId(asset);
    if (sceneId !== null) {
      bySceneId.set(sceneId, asset);
      continue;
    }
    unscopedAssets.push(asset);
  }

  return { bySceneId, unscopedAssets };
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
  const imageLookup = buildAssetLookup(imageAssets);
  const voiceLookup = buildAssetLookup(voiceAssets);
  const videoLookup = buildAssetLookup(videoAssets);

  return input.scenes.map((scene, index) => {
    const imageAsset =
      imageLookup.bySceneId.get(scene.sceneId) ??
      imageLookup.unscopedAssets[index];
    const voiceAsset =
      voiceLookup.bySceneId.get(scene.sceneId) ??
      voiceLookup.unscopedAssets[index];
    const videoAsset =
      videoLookup.bySceneId.get(scene.sceneId) ??
      videoLookup.unscopedAssets[index];

    return {
      sceneId: scene.sceneId,
      durationSec: scene.durationSec ?? 0,
      narration: scene.narration ?? "",
      disableNarration: scene.disableNarration ?? false,
      subtitle: scene.subtitle ?? "",
      imageS3Key: pickKey(imageAsset, "imageS3Key"),
      voiceS3Key: pickKey(voiceAsset, "voiceS3Key"),
      videoClipS3Key: pickKey(videoAsset, "videoClipS3Key"),
    };
  });
};
