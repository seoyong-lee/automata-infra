import {
  SendTaskFailureCommand,
  SendTaskSuccessCommand,
  sfnClient,
} from "./runtime-clients";

export const sendTaskSuccess = async (
  taskToken: string,
  output: unknown,
): Promise<void> => {
  await sfnClient.send(
    new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify(output),
    }),
  );
};

export const sendTaskFailure = async (
  taskToken: string,
  error: string,
  cause: string,
): Promise<void> => {
  await sfnClient.send(
    new SendTaskFailureCommand({
      taskToken,
      error,
      cause,
    }),
  );
};
