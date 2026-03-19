import { upsertSceneAsset } from "../../shared/lib/store/video-jobs";

export const saveVideoAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  videoAssets: unknown[];
}): Promise<void> => {
  for (const [index, asset] of input.videoAssets.entries()) {
    const typedAsset =
      asset && typeof asset === "object"
        ? (asset as Record<string, unknown>)
        : {};
    const sceneId =
      typeof typedAsset.sceneId === "number"
        ? typedAsset.sceneId
        : input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      await upsertSceneAsset(input.jobId, sceneId, typedAsset);
    }
  }
};
