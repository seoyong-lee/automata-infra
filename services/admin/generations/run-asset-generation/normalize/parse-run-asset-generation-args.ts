import { badUserInput } from "../../../shared/errors";

export type ParsedAssetGenerationModality = "ALL" | "IMAGE" | "VOICE" | "VIDEO";
export type ParsedImageGenerationProvider = "OPENAI" | "SEEDREAM";

export type ParsedRunAssetGenerationArgs = {
  jobId: string;
  targetSceneId?: number;
  modality?: ParsedAssetGenerationModality;
  imageProvider?: ParsedImageGenerationProvider;
  voiceProfileId?: string;
};

const parseModality = (
  raw: unknown,
): ParsedAssetGenerationModality | undefined => {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const s = String(raw).toUpperCase();
  if (s === "ALL") {
    return "ALL";
  }
  if (s === "IMAGE") {
    return "IMAGE";
  }
  if (s === "VOICE") {
    return "VOICE";
  }
  if (s === "VIDEO") {
    return "VIDEO";
  }
  throw badUserInput(`invalid modality: ${String(raw)}`);
};

const parseImageProvider = (
  raw: unknown,
): ParsedImageGenerationProvider | undefined => {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const s = String(raw).toUpperCase();
  if (s === "OPENAI") {
    return "OPENAI";
  }
  if (s === "SEEDREAM") {
    return "SEEDREAM";
  }
  throw badUserInput(`invalid imageProvider: ${String(raw)}`);
};

const parseInputObject = (
  args: Record<string, unknown>,
): Record<string, unknown> => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  return input;
};

const parseTargetSceneId = (raw: unknown): number | undefined => {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw badUserInput("targetSceneId must be a non-negative integer");
  }
  return n;
};

/** GraphQL `ID` 등 클라이언트·게이트웨이에 따라 string 외 타입이 올 수 있다. */
const parseOptionalVoiceProfileId = (raw: unknown): string | undefined => {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const t = String(raw).trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
};

export const parseRunAssetGenerationArgs = (
  args: Record<string, unknown>,
): ParsedRunAssetGenerationArgs => {
  const input = parseInputObject(args);
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }

  const targetSceneId = parseTargetSceneId(input.targetSceneId);
  const modality = parseModality(input.modality);
  const imageProvider = parseImageProvider(input.imageProvider);
  const voiceProfileId = parseOptionalVoiceProfileId(input.voiceProfileId);

  return {
    jobId,
    ...(targetSceneId !== undefined ? { targetSceneId } : {}),
    ...(modality !== undefined ? { modality } : {}),
    ...(imageProvider !== undefined ? { imageProvider } : {}),
    ...(voiceProfileId !== undefined ? { voiceProfileId } : {}),
  };
};
