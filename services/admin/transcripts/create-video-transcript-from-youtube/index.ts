import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateVideoTranscriptFromYoutubeArgs } from "./normalize/parse-create-video-transcript-from-youtube-args";
import { createVideoTranscriptFromYoutube } from "./usecase/create-video-transcript-from-youtube";

export const run = runAuditedAdminResolver({
  operation: "createVideoTranscriptFromYoutube",
  operationType: "mutation",
  parse: parseCreateVideoTranscriptFromYoutubeArgs,
  run: async ({ parsed }) => createVideoTranscriptFromYoutube(parsed),
});
