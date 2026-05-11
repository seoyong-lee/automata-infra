/* eslint-disable max-lines-per-function */
import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import {
  elevenLabsWithTimestampsResponseSchema,
  type ElevenLabsCharAlignment,
} from "../../contracts/elevenlabs-tts-alignment";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry } from "../http/retry";

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

const buildWithTimestampsUrl = (endpoint: string): string => {
  const base = endpoint.replace(/\/$/, "");
  return `${base}/with-timestamps?output_format=mp3_44100_128`;
};

/** Mock / test: uniform per-codepoint timing so render-plan can exercise vendor subtitle path. */
const buildMockCharAlignmentFromText = (
  text: string,
  durationSec: number,
): ElevenLabsCharAlignment => {
  const compact = text.replace(/\s+/g, " ").trim();
  const codepoints = compact.length > 0 ? Array.from(compact) : [" "];
  const n = codepoints.length;
  const span = Math.max(durationSec, 0.08);
  const step = span / n;
  return {
    characters: codepoints.map((c) => c),
    character_start_times_seconds: codepoints.map((_, i) => i * step),
    character_end_times_seconds: codepoints.map((_, i) => (i + 1) * step),
  };
};

const buildMockResponse = async (
  input: GenerateSceneVoiceInput,
  audioKey: string,
  rawKey: string,
  alignmentKey: string,
  estimatedDurationSec: number,
  candidateId: string,
  createdAt: string,
) => {
  const { resolvedVoiceId, resolvedModelId } = resolveVoiceConfig(input);
  const subtitleNorm = input.text.replace(/\s+/g, " ").trim();
  const mockAlignment = buildMockCharAlignmentFromText(
    input.text,
    estimatedDurationSec,
  );
  await putBufferToS3(audioKey, input.text, "text/plain");
  await putJsonToS3(alignmentKey, {
    normalized_alignment: mockAlignment,
    sourceText: subtitleNorm,
  });
  await putJsonToS3(rawKey, {
    mocked: true,
    text: input.text,
    voiceProfileId: input.voiceProfileId,
    voiceId: resolvedVoiceId,
    modelId: resolvedModelId,
    voiceAlignmentS3Key: alignmentKey,
  });

  return {
    candidateId,
    createdAt,
    provider: "mock",
    voiceS3Key: audioKey,
    providerLogS3Key: rawKey,
    voiceAlignmentS3Key: alignmentKey,
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
  voiceAlignmentS3Key?: string;
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
    ...(typeof input.voiceAlignmentS3Key === "string"
      ? { voiceAlignmentS3Key: input.voiceAlignmentS3Key }
      : {}),
  });
};

const createVoiceCandidateMeta = (input: GenerateSceneVoiceInput) => {
  const candidateId = randomUUID();
  return {
    candidateId,
    createdAt: new Date().toISOString(),
    audioKey: `assets/${input.jobId}/tts/scene-${input.sceneId}/${candidateId}.mp3`,
    rawKey: `logs/${input.jobId}/provider/tts-scene-${input.sceneId}-${candidateId}.json`,
    alignmentKey: `assets/${input.jobId}/tts/scene-${input.sceneId}/${candidateId}.alignment.json`,
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
  voiceAlignmentS3Key?: string;
}) => ({
  candidateId: input.candidateId,
  createdAt: input.createdAt,
  provider: input.provider,
  voiceS3Key: input.voiceS3Key,
  providerLogS3Key: input.providerLogS3Key,
  mocked: input.mocked,
  voiceProfileId: input.voiceProfileId,
  durationSec: input.durationSec,
  ...(typeof input.voiceAlignmentS3Key === "string" &&
  input.voiceAlignmentS3Key.length > 0
    ? { voiceAlignmentS3Key: input.voiceAlignmentS3Key }
    : {}),
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

/* eslint-disable complexity -- TTS JSON parse, S3 writes, and logging branches stay in one orchestration block. */
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
  alignmentKey: string;
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
    alignmentKey,
  } = input;
  const timestampsUrl = buildWithTimestampsUrl(endpoint);
  const requestBody = buildRequestBody(
    voiceInput,
    resolvedModelId,
    resolvedVoiceSettings,
  );
  try {
    const json = await fetchJsonWithRetry<unknown>(
      timestampsUrl,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
      },
      {
        maxAttempts: 4,
      },
    );
    const parsed = elevenLabsWithTimestampsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        "ElevenLabs with-timestamps response did not match expected shape",
      );
    }
    const audioBuffer = Buffer.from(parsed.data.audio_base64, "base64");
    const resolvedDurationSec = await resolveAudioDurationSec(
      audioBuffer,
      estimatedDurationSec,
    );
    await putBufferToS3(audioKey, audioBuffer, "audio/mpeg");
    const hasUsableAlignment =
      (parsed.data.normalized_alignment?.characters?.length ?? 0) > 0 ||
      (parsed.data.alignment?.characters?.length ?? 0) > 0;
    if (hasUsableAlignment) {
      await putJsonToS3(alignmentKey, {
        normalized_alignment: parsed.data.normalized_alignment,
        alignment: parsed.data.alignment,
        sourceText: voiceInput.text.replace(/\s+/g, " ").trim(),
      });
    }
    await writeVoiceLog({
      rawKey,
      status: 200,
      bytes: audioBuffer.byteLength,
      endpoint: timestampsUrl,
      resolvedVoiceId,
      resolvedModelId,
      voiceProfileId: voiceInput.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
      ...(hasUsableAlignment ? { voiceAlignmentS3Key: alignmentKey } : {}),
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
      ...(hasUsableAlignment ? { voiceAlignmentS3Key: alignmentKey } : {}),
    });
  } catch (error) {
    await logVoiceFailure({
      rawKey,
      endpoint: timestampsUrl,
      resolvedVoiceId,
      resolvedModelId,
      voiceProfileId: voiceInput.voiceProfileId,
      voiceSettings: resolvedVoiceSettings,
      error,
    });
    throw error;
  }
};
/* eslint-enable complexity */

export const generateSceneVoice = async (
  input: GenerateSceneVoiceInput,
): Promise<Record<string, unknown>> => {
  const apiKey = await loadElevenLabsApiKey(input.secretId);
  const { candidateId, createdAt, audioKey, rawKey, alignmentKey } =
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
      alignmentKey,
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
    alignmentKey,
  });
};
