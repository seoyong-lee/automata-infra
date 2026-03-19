import { Handler } from "aws-lambda";

export const handler: Handler = async () => {
  return {
    ok: true,
    collectedAt: new Date().toISOString(),
    status: "METRICS_COLLECTED",
  };
};
