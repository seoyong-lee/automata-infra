import { upsertSceneAsset } from "../../../../../shared/lib/store/video-jobs";
import { derivePexelsSearchQuery } from "../../../../../shared/lib/providers/media";
import { buildSceneStockSearchPrompt } from "../../../../../shared/lib/scene-visual-needs";
import { persistStockImageCandidates } from "../../repo/persist-stock-candidates";
import { runWithConcurrency } from "./run-with-concurrency";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";
import type { SearchStockImageFn } from "./stock-search-types";

const searchImageCandidatesForScene = async (input: {
  jobId: string;
  scene: SceneDefinition;
  language: string;
  secretId: string;
  searchStockImages: SearchStockImageFn;
  pexelsQueryOverride?: string;
}): Promise<void> => {
  const prompt = buildSceneStockSearchPrompt(input.scene, "image");
  const query =
    typeof input.pexelsQueryOverride === "string" &&
    input.pexelsQueryOverride.trim().length > 0
      ? input.pexelsQueryOverride.trim().replace(/\s+/g, " ")
      : derivePexelsSearchQuery(prompt);
  if (!query) {
    await upsertSceneAsset(input.jobId, input.scene.sceneId, {
      stockImageSearchStatus: "UNSUITABLE_PROMPT",
      stockImageSearchQuery: null,
    });
    return;
  }

  const promptForHash =
    typeof input.pexelsQueryOverride === "string" &&
    input.pexelsQueryOverride.trim().length > 0
      ? `[pexels-query] ${query}`
      : prompt;

  const assets = await input.searchStockImages({
    jobId: input.jobId,
    sceneId: input.scene.sceneId,
    prompt: promptForHash,
    query,
    language: input.language,
    secretId: input.secretId,
  });
  await persistStockImageCandidates(input.jobId, input.scene.sceneId, assets);
  await upsertSceneAsset(input.jobId, input.scene.sceneId, {
    stockImageSearchStatus: assets.length > 0 ? "FOUND" : "NO_RESULT",
    stockImageSearchQuery: query,
  });
};

export const searchImageCandidatesAcrossScenes = async (input: {
  jobId: string;
  scenes: SceneDefinition[];
  language: string;
  secretId: string;
  searchStockImages: SearchStockImageFn;
  pexelsQueryOverride?: string;
}): Promise<void> => {
  await runWithConcurrency(input.scenes, 2, (scene) =>
    searchImageCandidatesForScene({
      jobId: input.jobId,
      scene,
      language: input.language,
      secretId: input.secretId,
      searchStockImages: input.searchStockImages,
      pexelsQueryOverride: input.pexelsQueryOverride,
    }),
  );
};
