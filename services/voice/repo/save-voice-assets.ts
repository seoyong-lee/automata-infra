import {
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { mapGeneratedVoiceFields } from "../mapper/map-generated-voice-fields";

export const saveVoiceAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  voiceAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.voiceAssets.entries()) {
    const typedAsset =
      asset && typeof asset === "object"
        ? (asset as Record<string, unknown>)
        : {};
    const sceneId =
      typeof typedAsset.sceneId === "number"
        ? typedAsset.sceneId
        : input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      const patch = mapGeneratedVoiceFields(typedAsset, sceneId);
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSETS_READY");
  }
};
