import { randomUUID } from "crypto";

import { badUserInput } from "../../../shared/errors";

export type ParsedUpsertVoiceProfileArgs = {
  profileId: string;
  label: string;
  provider: string;
  voiceId: string;
  modelId?: string;
  sampleAudioUrl?: string;
  description?: string;
  language?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  isActive: boolean;
};

const MIN_ELEVENLABS_SPEED = 0.7;
const MAX_ELEVENLABS_SPEED = 1.2;

const parseOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseOptionalNumber = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw badUserInput(`${field} must be a number`);
  }
  return parsed;
};

const parseOptionalSpeed = (value: unknown): number | undefined => {
  const parsed = parseOptionalNumber(value, "speed");
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed < MIN_ELEVENLABS_SPEED || parsed > MAX_ELEVENLABS_SPEED) {
    throw badUserInput(
      `speed must be between ${MIN_ELEVENLABS_SPEED} and ${MAX_ELEVENLABS_SPEED}`,
    );
  }
  return parsed;
};

export const parseUpsertVoiceProfileArgs = (
  args: Record<string, unknown>,
): ParsedUpsertVoiceProfileArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }

  const label = parseOptionalString(input.label);
  const provider = parseOptionalString(input.provider);
  const voiceId = parseOptionalString(input.voiceId);
  if (!label || !provider || !voiceId) {
    throw badUserInput("label, provider, and voiceId are required");
  }

  const profileId = parseOptionalString(input.profileId) ?? randomUUID();

  return {
    profileId,
    label,
    provider,
    voiceId,
    modelId: parseOptionalString(input.modelId),
    sampleAudioUrl: parseOptionalString(input.sampleAudioUrl),
    description: parseOptionalString(input.description),
    language: parseOptionalString(input.language),
    speed: parseOptionalSpeed(input.speed),
    stability: parseOptionalNumber(input.stability, "stability"),
    similarityBoost: parseOptionalNumber(
      input.similarityBoost,
      "similarityBoost",
    ),
    style: parseOptionalNumber(input.style, "style"),
    useSpeakerBoost:
      typeof input.useSpeakerBoost === "boolean"
        ? input.useSpeakerBoost
        : undefined,
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
  };
};
