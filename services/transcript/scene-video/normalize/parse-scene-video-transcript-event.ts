import { parseSceneVideoTranscriptWorkerEvent } from "../../../shared/lib/contracts/video-transcript";

export const parseSceneVideoTranscriptEvent = (event: unknown) => {
  return parseSceneVideoTranscriptWorkerEvent(event);
};
