import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";

type ElevenLabsSecret = {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  endpoint?: string;
};

export const generateSceneVoice = async (input: {
  jobId: string;
  sceneId: number;
  text: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ElevenLabsSecret>(input.secretId);
  const audioKey = `assets/${input.jobId}/tts/scene-${input.sceneId}.mp3`;
  const rawKey = `logs/${input.jobId}/provider/tts-scene-${input.sceneId}.json`;

  if (!secret?.apiKey || !secret.voiceId) {
    await putBufferToS3(audioKey, input.text, "text/plain");
    await putJsonToS3(rawKey, { mocked: true, text: input.text });

    return {
      provider: "mock",
      voiceS3Key: audioKey,
      providerLogS3Key: rawKey,
      mocked: true,
    };
  }

  const endpoint =
    secret.endpoint ??
    `https://api.elevenlabs.io/v1/text-to-speech/${secret.voiceId}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": secret.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: secret.modelId ?? "eleven_multilingual_v2",
    }),
  });

  const arrayBuffer = await response.arrayBuffer();
  await putBufferToS3(audioKey, Buffer.from(arrayBuffer), "audio/mpeg");
  await putJsonToS3(rawKey, {
    status: response.status,
    voiceId: secret.voiceId,
    bytes: arrayBuffer.byteLength,
  });

  return {
    provider: "elevenlabs-tts",
    voiceS3Key: audioKey,
    providerLogS3Key: rawKey,
    mocked: false,
  };
};
