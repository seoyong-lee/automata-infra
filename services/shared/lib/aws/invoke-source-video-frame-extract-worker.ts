import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { SourceVideoFrameExtractWorkerEvent } from "../contracts/source-video-insight";

const client = new LambdaClient({});

export const invokeSourceVideoFrameExtractWorkerAsync = async (
  input: SourceVideoFrameExtractWorkerEvent,
): Promise<void> => {
  const fn =
    process.env.SOURCE_VIDEO_FRAME_EXTRACT_WORKER_FUNCTION_NAME?.trim();
  if (!fn) {
    throw new Error(
      "SOURCE_VIDEO_FRAME_EXTRACT_WORKER_FUNCTION_NAME is not configured",
    );
  }

  await client.send(
    new InvokeCommand({
      FunctionName: fn,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(input)),
    }),
  );
};
