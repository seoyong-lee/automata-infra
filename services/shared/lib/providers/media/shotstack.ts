import { getSecretJson, putJsonToS3 } from "../../aws/runtime";

type ShotstackSecret = {
  apiKey: string;
  endpoint?: string;
};

export const composeWithShotstack = async (input: {
  jobId: string;
  renderPlan: Record<string, unknown>;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ShotstackSecret>(input.secretId);
  const rawKey = `logs/${input.jobId}/composition/shotstack-request.json`;

  if (!secret?.apiKey) {
    await putJsonToS3(rawKey, { mocked: true, renderPlan: input.renderPlan });
    return {
      provider: "mock",
      mocked: true,
      responseLogS3Key: rawKey,
      finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
      thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
      previewS3Key: `previews/${input.jobId}/preview.mp4`,
    };
  }

  const endpoint = secret.endpoint ?? "https://api.shotstack.io/stage/render";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": secret.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.renderPlan),
  });

  const payload = await response.json();
  await putJsonToS3(rawKey, payload);

  return {
    provider: "shotstack",
    mocked: false,
    responseLogS3Key: rawKey,
    providerRenderId:
      (payload as { response?: { id?: string } }).response?.id ?? null,
    finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
    thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
    previewS3Key: `previews/${input.jobId}/preview.mp4`,
  };
};
