import { SendMessageCommand, sqsClient } from "./runtime-clients";
import { getReviewQueueUrl } from "./runtime-env";

export const sendSqsMessage = async (
  queueUrl: string,
  messageBody: Record<string, unknown>,
): Promise<void> => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    }),
  );
};

export const sendReviewMessage = async (
  messageBody: Record<string, unknown>,
): Promise<void> => {
  await sendSqsMessage(getReviewQueueUrl(), messageBody);
};
