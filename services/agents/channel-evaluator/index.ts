import type { SQSEvent } from "aws-lambda";

import { runChannelEvaluatorSqsMessage } from "./usecase/run-channel-evaluator-sqs";

export const run = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    await runChannelEvaluatorSqsMessage(record.body ?? "{}");
  }
};
