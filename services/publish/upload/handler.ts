import { APIGatewayProxyHandler } from "aws-lambda";
import {
  putUploadRecord,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = event.body
    ? (JSON.parse(event.body) as Record<string, unknown>)
    : {};
  const jobId = typeof body.jobId === "string" ? body.jobId : null;

  if (!jobId) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "jobId is required" }),
    };
  }

  await putUploadRecord(jobId, {
    platform: "youtube",
    uploadStatus: "QUEUED",
    requestedAt: new Date().toISOString(),
    visibility: "private",
  });

  await updateJobMeta(jobId, { uploadStatus: "QUEUED" }, "APPROVED");

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ok: true,
      jobId,
      status: "UPLOAD_QUEUED",
      platform: "youtube",
    }),
  };
};
