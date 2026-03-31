import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateVideoTranscriptFromUploadArgs } from "./normalize/parse-create-video-transcript-from-upload-args";
import { createVideoTranscriptFromUpload } from "./usecase/create-video-transcript-from-upload";

export const run = runAuditedAdminResolver({
  operation: "createVideoTranscriptFromUpload",
  operationType: "mutation",
  parse: parseCreateVideoTranscriptFromUploadArgs,
  run: async ({ parsed }) => createVideoTranscriptFromUpload(parsed),
});
