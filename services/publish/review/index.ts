import { APIGatewayProxyHandler } from "aws-lambda";
import { jsonResponse } from "./mapper/json-response";
import { parseReviewBody } from "./normalize/parse-review-body";
import { processReviewDecision } from "./usecase/process-review-decision";

export const run: APIGatewayProxyHandler = async (event) => {
  const { jobId, action, regenerationScope, targetSceneId } = parseReviewBody(
    event.body ?? null,
  );

  if (!jobId) {
    return jsonResponse(400, { ok: false, error: "jobId is required" });
  }

  const result = await processReviewDecision({
    jobId,
    action,
    regenerationScope,
    targetSceneId,
  });

  if (!result.ok) {
    return jsonResponse(result.statusCode, {
      ok: false,
      error: result.error ?? "review processing failed",
    });
  }

  return jsonResponse(200, {
    ok: true,
    action,
    jobId,
    regenerationScope,
    status: "REVIEW_DECISION_RECORDED",
  });
};
