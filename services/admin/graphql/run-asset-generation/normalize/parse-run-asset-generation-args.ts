import { badUserInput } from "../../shared/errors";

export type ParsedAssetGenerationModality = "ALL" | "IMAGE" | "VOICE" | "VIDEO";

export type ParsedRunAssetGenerationArgs = {
  jobId: string;
  targetSceneId?: number;
  modality?: ParsedAssetGenerationModality;
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

export const parseRunAssetGenerationArgs = (
  args: Record<string, unknown>,
): ParsedRunAssetGenerationArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) {
    throw badUserInput("jobId is required");
  }

  let targetSceneId: number | undefined;
  if (input.targetSceneId !== null && input.targetSceneId !== undefined) {
    const n = Number(input.targetSceneId);
    if (!Number.isInteger(n) || n < 0) {
      throw badUserInput("targetSceneId must be a non-negative integer");
    }
    targetSceneId = n;
  }

  const modality = parseModality(input.modality);

  return {
    jobId,
    ...(targetSceneId !== undefined ? { targetSceneId } : {}),
    ...(modality !== undefined ? { modality } : {}),
  };
};
