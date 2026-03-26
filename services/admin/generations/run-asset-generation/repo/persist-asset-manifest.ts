import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  assetManifestSchema,
  type AssetManifest,
} from "../../../../shared/lib/contracts/asset-manifest-schema";
import {
  listSceneAssets,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import { getAssetManifestKey } from "./get-asset-manifest-key";

export const persistAssetManifestForJob = async (input: {
  jobId: string;
  sceneJsonS3Key: string;
}): Promise<string> => {
  const rows = await listSceneAssets(input.jobId);
  const manifest: AssetManifest = assetManifestSchema.parse({
    version: 1,
    jobId: input.jobId,
    sceneJsonS3Key: input.sceneJsonS3Key,
    generatedAt: new Date().toISOString(),
    scenes: rows.map((row) => ({
      sceneId: row.sceneId,
      ...(typeof row.imageS3Key === "string" && row.imageS3Key.length > 0
        ? { imageS3Key: row.imageS3Key }
        : {}),
      ...(typeof row.videoClipS3Key === "string" &&
      row.videoClipS3Key.length > 0
        ? { videoClipS3Key: row.videoClipS3Key }
        : {}),
      ...(typeof row.voiceS3Key === "string" && row.voiceS3Key.length > 0
        ? { voiceS3Key: row.voiceS3Key }
        : {}),
      ...(typeof row.validationStatus === "string" &&
      row.validationStatus.length > 0
        ? { validationStatus: row.validationStatus }
        : {}),
    })),
  });

  const key = getAssetManifestKey(input.jobId);
  await putJsonToS3(key, manifest);
  await updateJobMeta(input.jobId, { assetManifestS3Key: key });
  return key;
};
