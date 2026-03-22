import { badUserInput } from "../../shared/errors";

export type ParsedAssetGenerationModality = "ALL" | "IMAGE" | "VOICE" | "VIDEO";
export type ParsedImageGenerationProvider = "OPENAI" | "SEEDREAM";

export type ParsedRunAssetGenerationArgs = {
  jobId: string;
  targetSceneId?: number;
  modality?: ParsedAssetGenerationModality;
  imageProvider?: ParsedImageGenerationProvider;
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

  return {
    jobId,
    ...(targetSceneId !== undefined ? { targetSceneId } : {}),
    ...(modality !== undefined ? { modality } : {}),
    ...(imageProvider !== undefined ? { imageProvider } : {}),
  };
};
