import type { SQSEvent } from "aws-lambda";

import { runTrendScoutSqsMessage } from "./usecase/run-trend-scout-sqs";

export const run = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    await runTrendScoutSqsMessage(record.body ?? "{}");
  }
};
