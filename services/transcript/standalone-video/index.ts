import type { Handler } from "aws-lambda";

import { parseStandaloneVideoTranscriptEvent } from "./normalize/parse-standalone-video-transcript-event";
import { processUploadVideoTranscript } from "./usecase/process-upload-video-transcript";
import { processYoutubeVideoTranscript } from "./usecase/process-youtube-video-transcript";

export const run: Handler<unknown, void> = async (event) => {
  const parsed = parseStandaloneVideoTranscriptEvent(event);
  if (parsed.kind === "YOUTUBE_URL") {
    await processYoutubeVideoTranscript(parsed);
    return;
  }
  await processUploadVideoTranscript(parsed);
};
