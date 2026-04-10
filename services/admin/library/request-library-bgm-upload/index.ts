import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRequestLibraryBgmUploadArgs } from "./normalize/parse-request-library-bgm-upload-args";
import { requestLibraryBgmUpload } from "./usecase/request-library-bgm-upload";

export const run = runAuditedAdminResolver({
  operation: "requestLibraryBgmUpload",
  operationType: "mutation",
  parse: parseRequestLibraryBgmUploadArgs,
  run: async ({ parsed }) => requestLibraryBgmUpload(parsed),
});
