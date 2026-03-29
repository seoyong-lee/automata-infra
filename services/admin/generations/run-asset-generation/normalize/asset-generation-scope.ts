import type { ParsedRunAssetGenerationArgs } from "./parse-run-asset-generation-args";

export type AssetGenerationScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "voice" | "video";
  imageProvider?: "openai" | "byteplus";
};

export const toAssetGenerationScope = (
  parsed: ParsedRunAssetGenerationArgs,
): AssetGenerationScope => {
  const modalityStr =
    parsed.modality === "IMAGE"
      ? "image"
      : parsed.modality === "VOICE"
        ? "voice"
        : parsed.modality === "VIDEO"
          ? "video"
          : "all";
  return {
    ...(parsed.targetSceneId !== undefined
      ? { targetSceneId: parsed.targetSceneId }
      : {}),
    modality: modalityStr,
    ...(parsed.imageProvider === "OPENAI"
      ? { imageProvider: "openai" as const }
      : parsed.imageProvider === "SEEDREAM"
        ? { imageProvider: "byteplus" as const }
        : {}),
  };
};

export const isFullStrictFinalize = (scope: AssetGenerationScope): boolean =>
  scope.targetSceneId === undefined && scope.modality === "all";
