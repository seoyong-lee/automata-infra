import {
  putSceneVoiceCandidate,
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { mapGeneratedVoiceFields } from "../mapper/map-generated-voice-fields";

const asRecord = (asset: unknown): Record<string, unknown> =>
  asset && typeof asset === "object" ? (asset as Record<string, unknown>) : {};

const resolveSceneId = (
  typedAsset: Record<string, unknown>,
  sceneId?: number,
): number | undefined =>
  typeof typedAsset.sceneId === "number" ? typedAsset.sceneId : sceneId;

const persistVoiceCandidate = async (
  jobId: string,
  sceneId: number,
  typedAsset: Record<string, unknown>,
) => {
  const candidateId =
    typeof typedAsset.candidateId === "string"
      ? typedAsset.candidateId
      : undefined;
  const voiceS3Key =
    typeof typedAsset.voiceS3Key === "string"
      ? typedAsset.voiceS3Key
      : undefined;
  if (!candidateId || !voiceS3Key) {
    return;
  }
  await putSceneVoiceCandidate(jobId, sceneId, candidateId, {
    voiceS3Key,
    createdAt:
      typeof typedAsset.createdAt === "string"
        ? typedAsset.createdAt
        : new Date().toISOString(),
    provider:
      typeof typedAsset.provider === "string" ? typedAsset.provider : undefined,
    providerLogS3Key:
      typeof typedAsset.providerLogS3Key === "string"
        ? typedAsset.providerLogS3Key
        : undefined,
    mocked:
      typeof typedAsset.mocked === "boolean" ? typedAsset.mocked : undefined,
    voiceDurationSec:
      typeof typedAsset.durationSec === "number"
        ? typedAsset.durationSec
        : undefined,
    voiceProfileId:
      typeof typedAsset.voiceProfileId === "string"
        ? typedAsset.voiceProfileId
        : undefined,
  });
};

export const saveVoiceAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  voiceAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.voiceAssets.entries()) {
    const typedAsset = asRecord(asset);
    const sceneId = resolveSceneId(typedAsset, input.scenes[index]?.sceneId);
    if (typeof sceneId === "number") {
      const patch = mapGeneratedVoiceFields(typedAsset, sceneId);
      await persistVoiceCandidate(input.jobId, sceneId, typedAsset);
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSETS_READY");
  }
};
