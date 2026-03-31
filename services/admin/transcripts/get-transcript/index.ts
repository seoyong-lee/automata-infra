import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseGetTranscriptArgs } from "./normalize/parse-get-transcript-args";
import { getTranscript } from "./usecase/get-transcript";

export const run = runAuditedAdminResolver({
  operation: "getTranscript",
  operationType: "query",
  parse: parseGetTranscriptArgs,
  run: async ({ parsed }) => getTranscript(parsed),
});
