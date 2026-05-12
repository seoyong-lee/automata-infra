import type { Handler } from "aws-lambda";

import { sourceVideoFrameExtractWorkerEventSchema } from "../../../shared/lib/contracts/source-video-insight";
import { executeSourceVideoFrameExtract } from "../run-source-video-frame-extract/usecase/run-source-video-frame-extract";

export const handler: Handler = async (event: unknown) => {
  const parsed = sourceVideoFrameExtractWorkerEventSchema.parse(event);
  await executeSourceVideoFrameExtract(parsed);
};
