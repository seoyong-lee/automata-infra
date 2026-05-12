import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import {
  sourceVideoFrameExtractResultS3Key,
  sourceVideoFrameExtractStoredResultSchema,
  type SourceVideoFrameExtractStoredResult,
} from "../../../../shared/lib/contracts/source-video-insight";

export const loadValidatedFrameExtractResult = async (input: {
  jobId: string;
  insightResultS3Key?: string;
}): Promise<SourceVideoFrameExtractStoredResult> => {
  const key =
    input.insightResultS3Key?.trim() ||
    sourceVideoFrameExtractResultS3Key(input.jobId);
  const raw = await getJsonFromS3<Record<string, unknown>>(key);
  if (!raw) {
    throw new Error(
      `source video frame extract result not found at S3 key: ${key}`,
    );
  }
  return sourceVideoFrameExtractStoredResultSchema.parse(raw);
};
