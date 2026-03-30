import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { SceneVideoTranscriptWorkerEvent } from "../contracts/video-transcript";

const client = new LambdaClient({});

export const invokeSceneVideoTranscriptWorkerAsync = async (
  input: SceneVideoTranscriptWorkerEvent,
): Promise<void> => {
  const fn = process.env.SCENE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME?.trim();
  if (!fn) {
    throw new Error(
      "SCENE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME is not configured",
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
