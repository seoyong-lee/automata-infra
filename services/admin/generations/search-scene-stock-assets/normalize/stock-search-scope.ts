import type { SearchSceneStockAssetsInputDto } from "./parse-search-scene-stock-assets-args";

export type StockSearchScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "video";
};

export const toStockSearchScope = (
  parsed: SearchSceneStockAssetsInputDto,
): StockSearchScope => {
  return {
    ...(parsed.targetSceneId !== undefined
      ? { targetSceneId: parsed.targetSceneId }
      : {}),
    modality:
      parsed.modality === "IMAGE"
        ? "image"
        : parsed.modality === "VIDEO"
          ? "video"
          : "all",
  };
};
