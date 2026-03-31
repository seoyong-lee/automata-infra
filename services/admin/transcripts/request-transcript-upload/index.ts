import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRequestTranscriptUploadArgs } from "./normalize/parse-request-transcript-upload-args";
import { requestTranscriptUpload } from "./usecase/request-transcript-upload";

export const run = runAuditedAdminResolver({
  operation: "requestTranscriptUpload",
  operationType: "mutation",
  parse: parseRequestTranscriptUploadArgs,
  run: async ({ parsed }) => requestTranscriptUpload(parsed),
});
