import { upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import {
  derivePexelsSearchQuery,
  searchPexelsPhotoCandidates,
  searchPexelsVideoCandidates,
} from "../../../../shared/lib/providers/media";
import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { loadStockSearchContext } from "../repo/load-stock-search-context";
import {
  persistStockImageCandidates,
  persistStockVideoCandidates,
} from "../repo/persist-stock-candidates";
import {
  toStockSearchScope,
  type StockSearchScope,
} from "../normalize/stock-search-scope";
import type { SceneDefinition } from "../../../../../types/render/scene-json";
import type { SearchSceneStockAssetsInputDto } from "../normalize/parse-search-scene-stock-assets-args";

type StockSearchPolicy = {
  allowImage: boolean;
  allowVideo: boolean;
};

type SearchStockImageFn = typeof searchPexelsPhotoCandidates;
type SearchStockVideoFn = typeof searchPexelsVideoCandidates;

const runWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  if (items.length === 0) {
    return;
  }
  const runnerCount = Math.max(
    1,
    Math.min(items.length, Math.floor(concurrency)),
  );
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: runnerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        if (item !== undefined) {
          await worker(item);
        }
      }
    }),
  );
};

const loadStockSearchPolicy = async (
  jobId: string,
): Promise<StockSearchPolicy> => {
  const job = await getJobOrThrow(jobId);
  const [jobBrief, contentBrief] = await Promise.all([
    getStoredJobBrief(job),
    getStoredContentBrief(job),
  ]);
  const resolvedPolicy =
    jobBrief?.resolvedPolicy ?? contentBrief?.resolvedPolicy ?? undefined;
  if (!resolvedPolicy) {
    return {
      allowImage: true,
      allowVideo: true,
    };
  }

  return {
    allowImage: resolvedPolicy.capabilities.supportsStockImage,
    allowVideo: resolvedPolicy.capabilities.supportsStockVideo,
  };
};

const assertStockSearchAllowed = (
  scope: StockSearchScope,
  policy: StockSearchPolicy,
): void => {
  if (scope.modality === "image" && !policy.allowImage) {
    throw new Error("stock image search is disabled for this preset");
  }
  if (scope.modality === "video" && !policy.allowVideo) {
    throw new Error("stock video search is disabled for this preset");
  }
  if (scope.modality === "all" && !policy.allowImage && !policy.allowVideo) {
    throw new Error("stock asset search is disabled for this preset");
  }
};

const searchImageCandidatesAcrossScenes = async (input: {
  jobId: string;
  scenes: SceneDefinition[];
  language: string;
  secretId: string;
  searchStockImages: SearchStockImageFn;
}): Promise<void> => {
  await runWithConcurrency(input.scenes, 2, (scene) =>
    searchImageCandidatesForScene({
      jobId: input.jobId,
      scene,
      language: input.language,
      secretId: input.secretId,
      searchStockImages: input.searchStockImages,
    }),
  );
};

const searchVideoCandidatesAcrossScenes = async (input: {
  jobId: string;
  scenes: SceneDefinition[];
  language: string;
  secretId: string;
  searchStockVideos: SearchStockVideoFn;
}): Promise<void> => {
  // Video downloads hold large buffers in memory, so keep scene processing serial.
  await runWithConcurrency(input.scenes, 1, (scene) =>
    searchVideoCandidatesForScene({
      jobId: input.jobId,
      scene,
      language: input.language,
      secretId: input.secretId,
      searchStockVideos: input.searchStockVideos,
    }),
  );
};

const searchImageCandidatesForScene = async (input: {
  jobId: string;
  scene: SceneDefinition;
  language: string;
  secretId: string;
  searchStockImages: SearchStockImageFn;
}): Promise<void> => {
  const query = derivePexelsSearchQuery(input.scene.imagePrompt);
  if (!query) {
    await upsertSceneAsset(input.jobId, input.scene.sceneId, {
      stockImageSearchStatus: "UNSUITABLE_PROMPT",
      stockImageSearchQuery: null,
    });
    return;
  }

  const assets = await input.searchStockImages({
    jobId: input.jobId,
    sceneId: input.scene.sceneId,
    prompt: input.scene.imagePrompt,
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

const searchVideoCandidatesForScene = async (input: {
  jobId: string;
  scene: SceneDefinition;
  language: string;
  secretId: string;
  searchStockVideos: SearchStockVideoFn;
}): Promise<void> => {
  const prompt = input.scene.videoPrompt ?? "";
  const query = derivePexelsSearchQuery(prompt);
  if (!query) {
    await upsertSceneAsset(input.jobId, input.scene.sceneId, {
      stockVideoSearchStatus: "UNSUITABLE_PROMPT",
      stockVideoSearchQuery: null,
    });
    return;
  }

  const assets = await input.searchStockVideos({
    jobId: input.jobId,
    sceneId: input.scene.sceneId,
    prompt,
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

export const searchSceneStockAssetsUsecase = async (
  parsed: SearchSceneStockAssetsInputDto,
  deps: {
    searchStockImages?: SearchStockImageFn;
    searchStockVideos?: SearchStockVideoFn;
  } = {},
) => {
  const scope = toStockSearchScope(parsed);
  const policy = await loadStockSearchPolicy(parsed.jobId);
  assertStockSearchAllowed(scope, policy);

  const secretId = process.env.PEXELS_SECRET_ID?.trim();
  if (!secretId) {
    throw new Error("PEXELS_SECRET_ID is not configured");
  }

  const { sceneJson, scenes } = await loadStockSearchContext(
    parsed.jobId,
    scope,
  );
  const searchStockImages =
    deps.searchStockImages ?? searchPexelsPhotoCandidates;
  const searchStockVideos =
    deps.searchStockVideos ?? searchPexelsVideoCandidates;

  if (
    (scope.modality === "all" || scope.modality === "image") &&
    policy.allowImage
  ) {
    await searchImageCandidatesAcrossScenes({
      jobId: parsed.jobId,
      scenes,
      language: sceneJson.language,
      secretId,
      searchStockImages,
    });
  }

  if (
    (scope.modality === "all" || scope.modality === "video") &&
    policy.allowVideo
  ) {
    await searchVideoCandidatesAcrossScenes({
      jobId: parsed.jobId,
      scenes,
      language: sceneJson.language,
      secretId,
      searchStockVideos,
    });
  }

  return getJobDraftView(parsed.jobId);
};
