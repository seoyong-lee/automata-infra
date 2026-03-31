import { parseStandaloneVideoTranscriptWorkerEvent } from "../../../shared/lib/contracts/standalone-video-transcript";

export const parseStandaloneVideoTranscriptEvent = (event: unknown) => {
  return parseStandaloneVideoTranscriptWorkerEvent(event);
};
