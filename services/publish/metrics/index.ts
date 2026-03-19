import { Handler } from "aws-lambda";
import { updateJobMeta } from "../../shared/lib/store/video-jobs";

type MetricsEvent = {
  jobId?: string;
  status?: string;
  [key: string]: unknown;
};

export const run: Handler<MetricsEvent, Record<string, unknown>> = async (
  event,
) => {
  const collectedAt = new Date().toISOString();

  if (event?.jobId) {
    await updateJobMeta(
      event.jobId,
      {
        metricsCollectedAt: collectedAt,
        workflowTerminalStatus:
          typeof event.status === "string" ? event.status : undefined,
      },
      "METRICS_COLLECTED",
    );

    return {
      ...event,
      metrics: {
        collectedAt,
      },
      status: "METRICS_COLLECTED",
    };
  }

  return {
    ok: true,
    collectedAt,
    status: "METRICS_COLLECTED",
  };
};
