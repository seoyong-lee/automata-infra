import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import { fetchArrayBufferWithRetry } from "../http/retry";

type ElevenLabsSecret = {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  endpoint?: string;
};

export type ElevenLabsVoiceSettings = {
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
};

type GenerateSceneVoiceInput = {
  jobId: string;
  sceneId: number;
  text: string;
  secretId: string;
  targetDurationSec?: number;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  voiceProfileId?: string;
};

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_SPEED = 1;
const MIN_AUTO_SPEED = 0.7;
const MAX_AUTO_SPEED = 1.2;
const ESTIMATED_SPOKEN_CHARS_PER_SEC = 4.5;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const estimateSpeechDurationSec = (text: string): number => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) {
    return 0;
  }
  return compact.length / ESTIMATED_SPOKEN_CHARS_PER_SEC;
};

export const estimateResolvedVoiceDurationSec = (
  text: string,
  speed = DEFAULT_SPEED,
): number => {
  const safeSpeed = clamp(speed, MIN_AUTO_SPEED, MAX_AUTO_SPEED);
  return estimateSpeechDurationSec(text) / safeSpeed;
};

export const estimateMinimumVoiceDurationSec = (text: string): number => {
  return estimateResolvedVoiceDurationSec(text, MAX_AUTO_SPEED);
};

const resolveVoiceSettings = (
  input: GenerateSceneVoiceInput,
): ElevenLabsVoiceSettings | undefined => {
  const baseSettings = input.voiceSettings ?? {};
  const hasBaseSettings = Object.values(baseSettings).some(
    (value) => value !== undefined,
  );
  const baseSpeed =
    typeof baseSettings.speed === "number" &&
    Number.isFinite(baseSettings.speed)
      ? baseSettings.speed
      : DEFAULT_SPEED;
  const estimatedDurationSec = estimateSpeechDurationSec(input.text);
  const targetDurationSec =
    typeof input.targetDurationSec === "number" && input.targetDurationSec > 0
      ? input.targetDurationSec
      : undefined;
  const autoSpeed =
    targetDurationSec && estimatedDurationSec > targetDurationSec
      ? estimatedDurationSec / targetDurationSec
      : baseSpeed;
  const requiresSpeedAdjustment =
    targetDurationSec !== undefined && estimatedDurationSec > targetDurationSec;
  if (!hasBaseSettings && !requiresSpeedAdjustment) {
    return undefined;
  }
  const resolvedSpeed = clamp(
    Math.max(baseSpeed, autoSpeed),
    MIN_AUTO_SPEED,
    MAX_AUTO_SPEED,
  );
  const resolved = {
    ...baseSettings,
    speed: resolvedSpeed,
  };

  return Object.values(resolved).some((value) => value !== undefined)
    ? resolved
    : undefined;
};

const resolveVoiceConfig = (
  input: GenerateSceneVoiceInput,
  secret: ElevenLabsSecret | null,
) => {
  const resolvedVoiceId = input.voiceId ?? secret?.voiceId;
  const resolvedModelId = input.modelId ?? secret?.modelId ?? DEFAULT_MODEL_ID;
  const endpoint = (
    secret?.endpoint ?? "https://api.elevenlabs.io/v1/text-to-speech/{voiceId}"
  ).replace("{voiceId}", resolvedVoiceId ?? "");

  return {
    resolvedVoiceId,
    resolvedModelId,
    endpoint,
  };
};

const buildRequestBody = (
  input: GenerateSceneVoiceInput,
  modelId: string,
  voiceSettings?: ElevenLabsVoiceSettings,
) => {
  return JSON.stringify({
    text: input.text,
    model_id: modelId,
    ...(voiceSettings ? { voice_settings: voiceSettings } : {}),
  });
};

const buildMockResponse = async (
  input: GenerateSceneVoiceInput,
  audioKey: string,
  rawKey: string,
  estimatedDurationSec: number,
  candidateId: string,
  createdAt: string,
) => {
  await putBufferToS3(audioKey, input.text, "text/plain");
  await putJsonToS3(rawKey, { mocked: true, text: input.text });

  return {
    candidateId,
    createdAt,
    provider: "mock",
    voiceS3Key: audioKey,
    providerLogS3Key: rawKey,
    mocked: true,
    durationSec: estimatedDurationSec,
  };
};

const writeVoiceLog = async (input: {
  rawKey: string;
  status: number | "ERROR";
  endpoint: string;
  resolvedVoiceId?: string;
  resolvedModelId: string;
  voiceProfileId?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  bytes?: number;
  error?: string;
}) => {
  await putJsonToS3(input.rawKey, {
    status: input.status,
    endpoint: input.endpoint,
    voiceId: input.resolvedVoiceId,
    modelId: input.resolvedModelId,
    voiceProfileId: input.voiceProfileId,
    voiceSettings: input.voiceSettings,
    ...(typeof input.bytes === "number" ? { bytes: input.bytes } : {}),
    ...(input.error ? { error: input.error } : {}),
  });
};

const createVoiceCandidateMeta = (input: GenerateSceneVoiceInput) => {
  const candidateId = randomUUID();
  return {
    candidateId,
    createdAt: new Date().toISOString(),
    audioKey: `assets/${input.jobId}/tts/scene-${input.sceneId}/${candidateId}.mp3`,
    rawKey: `logs/${input.jobId}/provider/tts-scene-${input.sceneId}-${candidateId}.json`,
  };
};

const buildVoiceResult = (input: {
  candidateId: string;
  createdAt: string;
  provider: string;
  voiceS3Key: string;
  providerLogS3Key: string;
  mocked: boolean;
  voiceProfileId?: string;
  durationSec: number;
}) => ({
  candidateId: input.candidateId,
  createdAt: input.createdAt,
  provider: input.provider,
  voiceS3Key: input.voiceS3Key,
  providerLogS3Key: input.providerLogS3Key,
  mocked: input.mocked,
  voiceProfileId: input.voiceProfileId,
  durationSec: input.durationSec,
});

const resolveAudioDurationSec = async (
  buffer: Buffer,
  fallbackDurationSec: number,
): Promise<number> => {
  try {
    const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
    const durationSec = metadata.format.duration;
    return typeof durationSec === "number" && Number.isFinite(durationSec)
      ? durationSec
      : fallbackDurationSec;
  } catch {
    return fallbackDurationSec;
  }
};

const fetchVoiceAudio = async (input: {
  endpoint: string;
  apiKey: string;
  requestBody: string;
}) => {
  return fetchArrayBufferWithRetry(
    input.endpoint,
    {
      method: "POST",
      headers: {
        "xi-api-key": input.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: input.requestBody,
    },
    {
      maxAttempts: 4,
    },
  );
};

const logVoiceFailure = async (input: {
  rawKey: string;
  endpoint: string;
  resolvedVoiceId?: string;
  resolvedModelId: string;
  voiceProfileId?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  error: unknown;
}) => {
  await writeVoiceLog({
    rawKey: input.rawKey,
    status: "ERROR",
    endpoint: input.endpoint,
    resolvedVoiceId: input.resolvedVoiceId,
    resolvedModelId: input.resolvedModelId,
    voiceProfileId: input.voiceProfileId,
    voiceSettings: input.voiceSettings,
    error: input.error instanceof Error ? input.error.message : String(input.error),
  });
};

export const generateSceneVoice = async (
  input: GenerateSceneVoiceInput,
): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ElevenLabsSecret>(input.secretId);
  const { candidateId, createdAt, audioKey, rawKey } =
    createVoiceCandidateMeta(input);
  const { resolvedVoiceId, resolvedModelId, endpoint } = resolveVoiceConfig(
    input,
    secret,
  );
  const resolvedVoiceSettings = resolveVoiceSettings(input);
  const estimatedDurationSec = estimateResolvedVoiceDurationSec(
    input.text,
    resolvedVoiceSettings?.speed,
  );

  if (!secret?.apiKey || !resolvedVoiceId) {
    return buildMockResponse(
      input,
      audioKey,
      rawKey,
      estimatedDurationSec,
      candidateId,
      createdAt,
    );
  }

  try {
    const arrayBuffer = await fetchVoiceAudio({
      endpoint,
      apiKey: secret.apiKey,
      requestBody: buildRequestBody(input, resolvedModelId, resolvedVoiceSettings),
    });
    const audioBuffer = Buffer.from(arrayBuffer);
    const resolvedDurationSec = await resolveAudioDurationSec(
      audioBuffer,
      estimatedDurationSec,
    );
    await putBufferToS3(audioKey, audioBuffer, "audio/mpeg");
    await writeVoiceLog({
      rawKey,
      status: 200,
      bytes: arrayBuffer.byteLength,
      endpoint,
      resolvedVoiceId,
      resolvedModelId,
      voiceProfileId: input.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
    });

    return buildVoiceResult({
      candidateId,
      createdAt,
      provider: "elevenlabs-tts",
      voiceS3Key: audioKey,
      providerLogS3Key: rawKey,
      mocked: false,
      voiceProfileId: input.voiceProfileId,
      durationSec: resolvedDurationSec,
    });
  } catch (error) {
    await logVoiceFailure({
      rawKey,
      endpoint,
      resolvedVoiceId,
      resolvedModelId,
      voiceProfileId: input.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
      error,
    });
    throw error;
  }
};
