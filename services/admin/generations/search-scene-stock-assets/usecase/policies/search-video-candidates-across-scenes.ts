import { upsertSceneAsset } from "../../../../../shared/lib/store/video-jobs";
import { derivePexelsSearchQuery } from "../../../../../shared/lib/providers/media";
import { buildSceneStockSearchPrompt } from "../../../../../shared/lib/scene-visual-needs";
import { persistStockVideoCandidates } from "../../repo/persist-stock-candidates";
import { runWithConcurrency } from "./run-with-concurrency";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";
import type { SearchStockVideoFn } from "./stock-search-types";

const searchVideoCandidatesForScene = async (input: {
  jobId: string;
  scene: SceneDefinition;
  language: string;
  secretId: string;
  searchStockVideos: SearchStockVideoFn;
  pexelsQueryOverride?: string;
}): Promise<void> => {
  const prompt = buildSceneStockSearchPrompt(input.scene, "video");
  const query =
    typeof input.pexelsQueryOverride === "string" &&
    input.pexelsQueryOverride.trim().length > 0
      ? input.pexelsQueryOverride.trim().replace(/\s+/g, " ")
      : derivePexelsSearchQuery(prompt);
  if (!query) {
    await upsertSceneAsset(input.jobId, input.scene.sceneId, {
      stockVideoSearchStatus: "UNSUITABLE_PROMPT",
      stockVideoSearchQuery: null,
    });
    return;
  }

  const promptForHash =
    typeof input.pexelsQueryOverride === "string" &&
    input.pexelsQueryOverride.trim().length > 0
      ? `[pexels-query] ${query}`
      : prompt;

  const assets = await input.searchStockVideos({
    jobId: input.jobId,
    sceneId: input.scene.sceneId,
    prompt: promptForHash,
    query,
    language: input.language,
    targetDurationSec: input.scene.durationSec,
    secretId: input.secretId,
  });
  await persistStockVideoCandidates(input.jobId, input.scene.sceneId, assets);
  await upsertSceneAsset(input.jobId, input.scene.sceneId, {
    stockVideoSearchStatus: assets.length > 0 ? "FOUND" : "NO_RESULT",
    stockVideoSearchQuery: query,
  });
};

export const searchVideoCandidatesAcrossScenes = async (input: {
  jobId: string;
  scenes: SceneDefinition[];
  language: string;
  secretId: string;
  searchStockVideos: SearchStockVideoFn;
  pexelsQueryOverride?: string;
}): Promise<void> => {
  // Video downloads hold large buffers in memory, so keep scene processing serial.
  await runWithConcurrency(input.scenes, 1, (scene) =>
    searchVideoCandidatesForScene({
      jobId: input.jobId,
      scene,
      language: input.language,
      secretId: input.secretId,
      searchStockVideos: input.searchStockVideos,
      pexelsQueryOverride: input.pexelsQueryOverride,
    }),
  );
};
