import { deleteObjectFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  sourceVideoFrameExtractResultS3Key,
  sourceVideoFrameExtractStoredResultSchema,
  type SourceVideoFrameExtractStoredResult,
} from "../../../../shared/lib/contracts/source-video-insight";

const framePrefix = (jobId: string): string =>
  `jobs/${jobId}/source-video-insight/frames/`;

const assertDeletableFrameKey = (jobId: string, key: string): void => {
  const prefix = framePrefix(jobId);
  if (!key.startsWith(prefix) || key.includes("..")) {
    throw new Error(`refusing to delete non-frame key: ${key}`);
  }
};

/**
 * 씬 JSON까지 성공한 뒤 호출: 샘플 JPEG만 삭제하고 `frame-extract-result.json`은
 * 타임라인 요약(offset만) + `frameJpegsPurgedAt`으로 갱신한다.
 */
export const purgeSourceVideoInsightFrameJpegsAfterSceneJson = async (input: {
  jobId: string;
  insightResultS3Key: string;
  extract: SourceVideoFrameExtractStoredResult;
}): Promise<void> => {
  const keys = input.extract.frames
    .map((f) => f.imageS3Key?.trim())
    .filter((k): k is string => Boolean(k));

  for (const key of keys) {
    assertDeletableFrameKey(input.jobId, key);
    await deleteObjectFromS3(key);
  }

  const purgedAt = new Date().toISOString();
  const updated: SourceVideoFrameExtractStoredResult =
    sourceVideoFrameExtractStoredResultSchema.parse({
      ...input.extract,
      frames: input.extract.frames.map(({ offsetSec }) => ({ offsetSec })),
      frameJpegsPurgedAt: purgedAt,
    });

  await putJsonToS3(input.insightResultS3Key, updated);
};

export const resolveInsightResultS3Key = (
  jobId: string,
  insightResultS3Key?: string,
): string =>
  insightResultS3Key?.trim() || sourceVideoFrameExtractResultS3Key(jobId);
