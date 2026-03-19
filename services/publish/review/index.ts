import { APIGatewayProxyHandler } from "aws-lambda";
import {
  getJobMeta,
  putReviewRecord,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { sendTaskSuccess } from "../../shared/lib/aws/runtime";

type ReviewAction = "approve" | "reject" | "regenerate";

const normalizeAction = (action: string | undefined): ReviewAction => {
  if (action === "reject" || action === "regenerate") {
    return action;
  }

  return "approve";
};

const parseRequest = (
  body: string | null,
): {
  jobId: string | null;
  action: ReviewAction;
  regenerationScope: string;
} => {
  const payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};
  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;
  const action = normalizeAction(
    typeof payload.action === "string" ? payload.action : undefined,
  );
  const regenerationScope =
    typeof payload.regenerationScope === "string"
      ? payload.regenerationScope
      : "full";

  return {
    jobId,
    action,
    regenerationScope,
  };
};

const jsonResponse = (statusCode: number, body: Record<string, unknown>) => {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
};

const persistDecision = async (
  jobId: string,
  action: ReviewAction,
  regenerationScope: string,
): Promise<void> => {
  await putReviewRecord(jobId, {
    action,
    regenerationScope,
    decidedAt: new Date().toISOString(),
  });

  await updateJobMeta(jobId, {
    reviewTaskToken: null,
    reviewAction: action,
  });
};

const resolveNextStatus = (
  action: ReviewAction,
): "APPROVED" | "REJECTED" | "ASSET_GENERATING" => {
  if (action === "reject") {
    return "REJECTED";
  }

  if (action === "regenerate") {
    return "ASSET_GENERATING";
  }

  return "APPROVED";
};

export const run: APIGatewayProxyHandler = async (event) => {
  const { jobId, action, regenerationScope } = parseRequest(event.body ?? null);

  if (!jobId) {
    return jsonResponse(400, { ok: false, error: "jobId is required" });
  }

  const job = await getJobMeta(jobId);

  if (!job?.reviewTaskToken) {
    return jsonResponse(404, {
      ok: false,
      error: "pending review task not found",
    });
  }

  await persistDecision(jobId, action, regenerationScope);
  await updateJobMeta(
    jobId,
    action === "regenerate" ? { regenerationScope } : {},
    resolveNextStatus(action),
  );
  await sendTaskSuccess(job.reviewTaskToken, {
    action,
    regenerationScope,
  });

  return jsonResponse(200, {
    ok: true,
    action,
    jobId,
    regenerationScope,
    status: "REVIEW_DECISION_RECORDED",
  });
};
