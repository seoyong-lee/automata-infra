import {
  putSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

export const saveImageAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  imageAssets: unknown[];
}): Promise<void> => {
  for (const [index, asset] of input.imageAssets.entries()) {
    const sceneId = input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      await putSceneAsset(
        input.jobId,
        sceneId,
        asset as Record<string, unknown>,
      );
    }
  }

  await updateJobMeta(input.jobId, {}, "ASSET_GENERATING");
};
