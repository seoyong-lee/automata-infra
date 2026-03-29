import {
  GetSecretValueCommand,
  secretsClient,
} from "./runtime-clients";

export const getSecretJson = async <T>(secretId: string): Promise<T | null> => {
  const secretValue = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: secretId,
    }),
  );

  if (!secretValue.SecretString) {
    return null;
  }

  return JSON.parse(secretValue.SecretString) as T;
};
