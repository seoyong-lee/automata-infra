/* eslint-disable max-lines-per-function */
import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import { fetchArrayBufferWithRetry } from "../http/retry";

const ELEVENLABS_TTS_ENDPOINT_TEMPLATE =
  "https://api.elevenlabs.io/v1/text-to-speech/{voiceId}";

/** 시크릿 JSON에서 apiKey만 읽는다(voiceId·modelId·endpoint는 사용하지 않음). */
const loadElevenLabsApiKey = async (secretId: string): Promise<string> => {
  const raw = await getSecretJson<Record<string, unknown>>(secretId);
  if (!raw || typeof raw !== "object") {
    return "";
  }
  const k = (raw as { apiKey?: unknown }).apiKey;
  return typeof k === "string" && k.trim().length > 0 ? k.trim() : "";
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
  /** 씬 계획 길이(렌더에서 씬 연장 시 사용). TTS 속도 조절에는 쓰지 않음. */
  targetDurationSec?: number;
  /** ElevenLabs TTS URL에 쓰이는 보이스 id(Voice Profile·씬 입력에서만; 시크릿 미사용) */
  voiceId?: string;
  modelId?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  /** 앱 내부 Voice Profile id — API 바디에는 없고 로그·후보 메타에만 기록 */
  voiceProfileId?: string;
};

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_SPEED = 1;
const MIN_VOICE_SPEED = 0.7;
const MAX_VOICE_SPEED = 1.2;
/** ElevenLabs `voice_settings`: stability, similarity_boost, style — API는 [0, 1]만 허용 */
const MIN_VOICE_UNIT = 0;
const MAX_VOICE_UNIT = 1;
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
  const safeSpeed = clamp(speed, MIN_VOICE_SPEED, MAX_VOICE_SPEED);
  return estimateSpeechDurationSec(text) / safeSpeed;
};

export const estimateMinimumVoiceDurationSec = (text: string): number => {
  return estimateResolvedVoiceDurationSec(text, MAX_VOICE_SPEED);
};

/** 프로필 등에서 온 설정만 전달. 씬 duration에 맞춰 말 속도를 올리지 않음(렌더에서 씬 길이 조정). */
const resolveVoiceSettings = (
  input: GenerateSceneVoiceInput,
): ElevenLabsVoiceSettings | undefined => {
  const baseSettings = input.voiceSettings ?? {};
  const hasBaseSettings = Object.values(baseSettings).some(
    (value) => value !== undefined,
  );
  if (!hasBaseSettings) {
    return undefined;
  }
  const resolved = { ...baseSettings };
  if (typeof resolved.speed === "number" && Number.isFinite(resolved.speed)) {
    resolved.speed = clamp(resolved.speed, MIN_VOICE_SPEED, MAX_VOICE_SPEED);
  }
  if (
    typeof resolved.stability === "number" &&
    Number.isFinite(resolved.stability)
  ) {
    resolved.stability = clamp(
      resolved.stability,
      MIN_VOICE_UNIT,
      MAX_VOICE_UNIT,
    );
  }
  if (
    typeof resolved.similarityBoost === "number" &&
    Number.isFinite(resolved.similarityBoost)
  ) {
    resolved.similarityBoost = clamp(
      resolved.similarityBoost,
      MIN_VOICE_UNIT,
      MAX_VOICE_UNIT,
    );
  }
  if (typeof resolved.style === "number" && Number.isFinite(resolved.style)) {
    resolved.style = clamp(resolved.style, MIN_VOICE_UNIT, MAX_VOICE_UNIT);
  }
  return Object.values(resolved).some((value) => value !== undefined)
    ? resolved
    : undefined;
};

const resolveVoiceConfig = (input: GenerateSceneVoiceInput) => {
  const trimmedVoiceId =
    typeof input.voiceId === "string" && input.voiceId.trim().length > 0
      ? input.voiceId.trim()
      : undefined;
  const resolvedVoiceId = trimmedVoiceId;
  const trimmedModelId =
    typeof input.modelId === "string" && input.modelId.trim().length > 0
      ? input.modelId.trim()
      : undefined;
  const resolvedModelId = trimmedModelId ?? DEFAULT_MODEL_ID;
  const endpoint = ELEVENLABS_TTS_ENDPOINT_TEMPLATE.replace(
    "{voiceId}",
    resolvedVoiceId ?? "",
  );

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
  const { resolvedVoiceId, resolvedModelId } = resolveVoiceConfig(input);
  await putBufferToS3(audioKey, input.text, "text/plain");
  await putJsonToS3(rawKey, {
    mocked: true,
    text: input.text,
    voiceProfileId: input.voiceProfileId,
    voiceId: resolvedVoiceId,
    modelId: resolvedModelId,
  });

  return {
    candidateId,
    createdAt,
    provider: "mock",
    voiceS3Key: audioKey,
    providerLogS3Key: rawKey,
    mocked: true,
    voiceProfileId: input.voiceProfileId,
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
    error:
      input.error instanceof Error ? input.error.message : String(input.error),
  });
};

const fetchAndPersistElevenLabsTts = async (input: {
  input: GenerateSceneVoiceInput;
  apiKey: string;
  endpoint: string;
  resolvedVoiceId?: string;
  resolvedModelId: string;
  resolvedVoiceSettings: ElevenLabsVoiceSettings | undefined;
  estimatedDurationSec: number;
  candidateId: string;
  createdAt: string;
  audioKey: string;
  rawKey: string;
}): Promise<Record<string, unknown>> => {
  const {
    input: voiceInput,
    apiKey,
    endpoint,
    resolvedVoiceId,
    resolvedModelId,
    resolvedVoiceSettings,
    estimatedDurationSec,
    candidateId,
    createdAt,
    audioKey,
    rawKey,
  } = input;
  try {
    const arrayBuffer = await fetchVoiceAudio({
      endpoint,
      apiKey,
      requestBody: buildRequestBody(
        voiceInput,
        resolvedModelId,
        resolvedVoiceSettings,
      ),
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
      voiceProfileId: voiceInput.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
    });

    return buildVoiceResult({
      candidateId,
      createdAt,
      provider: "elevenlabs-tts",
      voiceS3Key: audioKey,
      providerLogS3Key: rawKey,
      mocked: false,
      voiceProfileId: voiceInput.voiceProfileId,
      durationSec: resolvedDurationSec,
    });
  } catch (error) {
    await logVoiceFailure({
      rawKey,
      endpoint,
      resolvedVoiceId,
      resolvedModelId,
      voiceProfileId: voiceInput.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
      error,
    });
    throw error;
  }
};

export const generateSceneVoice = async (
  input: GenerateSceneVoiceInput,
): Promise<Record<string, unknown>> => {
  const apiKey = await loadElevenLabsApiKey(input.secretId);
  const { candidateId, createdAt, audioKey, rawKey } =
    createVoiceCandidateMeta(input);
  const { resolvedVoiceId, resolvedModelId, endpoint } =
    resolveVoiceConfig(input);
  const resolvedVoiceSettings = resolveVoiceSettings(input);
  const estimatedDurationSec = estimateResolvedVoiceDurationSec(
    input.text,
    resolvedVoiceSettings?.speed,
  );

  if (!apiKey || !resolvedVoiceId) {
    return buildMockResponse(
      input,
      audioKey,
      rawKey,
      estimatedDurationSec,
      candidateId,
      createdAt,
    );
  }

  return fetchAndPersistElevenLabsTts({
    input,
    apiKey,
    endpoint,
    resolvedVoiceId,
    resolvedModelId,
    resolvedVoiceSettings,
    estimatedDurationSec,
    candidateId,
    createdAt,
    audioKey,
    rawKey,
  });
};
