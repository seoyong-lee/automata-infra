/**
 * Creates or updates AWS Secrets Manager JSON for YouTube Data API v3 project API key.
 *
 * Secret string shape: { "apiKey": "<your-browser-or-server-key>" }
 *
 * Usage:
 *   YOUTUBE_API_KEY=AIza... ts-node scripts/put-youtube-data-api-secret.ts
 *   ts-node scripts/put-youtube-data-api-secret.ts AIza...
 *
 * Optional env:
 *   AWS_REGION (default ap-northeast-2)
 *   YOUTUBE_DATA_API_SECRET_ID (default automata-studio/youtube)
 */
import {
  CreateSecretCommand,
  PutSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const region = process.env.AWS_REGION?.trim() || "ap-northeast-2";
const secretId =
  process.env.YOUTUBE_DATA_API_SECRET_ID?.trim() || "automata-studio/youtube";

const argvKey = process.argv[2]?.trim();
const envKey = process.env.YOUTUBE_API_KEY?.trim();
const apiKey = argvKey || envKey;

const run = async () => {
  if (!apiKey) {
    console.error(
      "Missing API key. Pass as argv or set YOUTUBE_API_KEY.\n" +
        "Example: YOUTUBE_API_KEY=AIza... ts-node scripts/put-youtube-data-api-secret.ts",
    );
    process.exit(1);
  }

  const secretString = JSON.stringify({ apiKey });
  const client = new SecretsManagerClient({ region });

  try {
    await client.send(
      new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretString,
      }),
    );
    console.info(`Updated secret: ${secretId}`);
    return;
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) {
      throw error;
    }
  }

  await client.send(
    new CreateSecretCommand({
      Name: secretId,
      SecretString: secretString,
    }),
  );
  console.info(`Created secret: ${secretId}`);
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
