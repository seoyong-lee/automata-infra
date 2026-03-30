import type { Handler } from "aws-lambda";

import { parseSceneVideoTranscriptEvent } from "./normalize/parse-scene-video-transcript-event";
import { processSceneVideoTranscript } from "./usecase/process-scene-video-transcript";
import { processYoutubeSceneVideoTranscript } from "./usecase/process-youtube-scene-video-transcript";

export const run: Handler<unknown, void> = async (event) => {
  const parsed = parseSceneVideoTranscriptEvent(event);
  if (parsed.kind === "YOUTUBE_URL") {
    await processYoutubeSceneVideoTranscript(parsed);
    return;
  }
  await processSceneVideoTranscript(parsed);
};
