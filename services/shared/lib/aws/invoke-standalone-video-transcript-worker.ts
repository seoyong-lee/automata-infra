import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { StandaloneVideoTranscriptWorkerEvent } from "../contracts/standalone-video-transcript";

const client = new LambdaClient({});

export const invokeStandaloneVideoTranscriptWorkerAsync = async (
  input: StandaloneVideoTranscriptWorkerEvent,
): Promise<void> => {
  const fn =
    process.env.STANDALONE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME?.trim();
  if (!fn) {
    throw new Error(
      "STANDALONE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME is not configured",
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
