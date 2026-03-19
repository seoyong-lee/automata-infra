import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = event.body ? JSON.parse(event.body) : {};

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ok: true,
      action: body.action ?? "approve",
      jobId: body.jobId ?? null,
      status: "REVIEW_DECISION_RECORDED",
    }),
  };
};
