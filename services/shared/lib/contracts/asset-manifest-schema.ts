import { z } from "zod";

/** Admin 에셋 생성 완료 시 S3에 저장하는 스냅샷(씬별 생성물 키 집계). */
export const assetManifestSceneSchema = z.object({
  sceneId: z.number(),
  imageS3Key: z.string().optional(),
  videoClipS3Key: z.string().optional(),
  voiceS3Key: z.string().optional(),
  validationStatus: z.string().optional(),
});

export const assetManifestSchema = z.object({
  version: z.literal(1),
  jobId: z.string(),
  sceneJsonS3Key: z.string(),
  generatedAt: z.string(),
  scenes: z.array(assetManifestSceneSchema),
});

export type AssetManifest = z.infer<typeof assetManifestSchema>;
