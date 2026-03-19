import {
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

export const saveImageAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  imageAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.imageAssets.entries()) {
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

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSET_GENERATING");
  }
};
