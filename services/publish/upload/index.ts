import { APIGatewayProxyHandler } from "aws-lambda";
import { buildUploadApiResponse } from "./mapper/build-upload-api-response";
import { parseUploadBody } from "./normalize/parse-upload-body";
import { requestUpload } from "./usecase/request-upload";

export const run: APIGatewayProxyHandler = async (event) => {
  const { jobId } = parseUploadBody(event.body ?? null);

  if (!jobId) {
    return buildUploadApiResponse(400, {
      ok: false,
      error: "jobId is required",
    });
  }

  const queued = await requestUpload(jobId);

  return buildUploadApiResponse(200, {
    ok: true,
    jobId,
    status: queued.status,
    platform: queued.platform,
  });
};
