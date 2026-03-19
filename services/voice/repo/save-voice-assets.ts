import {
  putSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

export const saveVoiceAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  voiceAssets: unknown[];
}): Promise<void> => {
  for (const [index, asset] of input.voiceAssets.entries()) {
    const sceneId = input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      await putSceneAsset(
        input.jobId,
        sceneId,
        asset as Record<string, unknown>,
      );
    }
  }

  await updateJobMeta(input.jobId, {}, "ASSETS_READY");
};
