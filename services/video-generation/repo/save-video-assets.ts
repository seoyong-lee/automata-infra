import { putSceneAsset } from "../../shared/lib/store/video-jobs";

export const saveVideoAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  videoAssets: unknown[];
}): Promise<void> => {
  for (const [index, asset] of input.videoAssets.entries()) {
    const sceneId = input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      await putSceneAsset(
        input.jobId,
        sceneId,
        asset as Record<string, unknown>,
      );
    }
  }
};
