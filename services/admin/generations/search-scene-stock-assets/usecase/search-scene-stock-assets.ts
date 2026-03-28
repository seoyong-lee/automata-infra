import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import {
  putSceneImageCandidate,
  putSceneVideoCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import {
  derivePexelsSearchQuery,
  searchPexelsPhotoCandidates,
  searchPexelsVideoCandidates,
} from "../../../../shared/lib/providers/media";
import { resolveSceneJsonS3KeyForAssetGeneration } from "../../../shared/lib/resolve-approved-pipeline-input";
import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { getJobDraft } from "../../../jobs/get-job-draft/repo/get-job-draft";
import type {
  SceneDefinition,
  SceneJson,
} from "../../../../../types/render/scene-json";
import type { SearchSceneStockAssetsInputDto } from "../normalize/parse-search-scene-stock-assets-args";

type StockSearchScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "video";
};

type StockSearchPolicy = {
  allowImage: boolean;
  allowVideo: boolean;
};

type SearchStockImageFn = typeof searchPexelsPhotoCandidates;
type SearchStockVideoFn = typeof searchPexelsVideoCandidates;

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  return typeof value === "number" ? value : undefined;
};

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

const toStockSearchScope = (
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

const loadSearchContext = async (
  jobId: string,
  scope: StockSearchScope,
): Promise<{ sceneJson: SceneJson; scenes: SceneDefinition[] }> => {
  const job = await getJobOrThrow(jobId);
  const sceneResolved = await resolveSceneJsonS3KeyForAssetGeneration(
    jobId,
    job,
  );
  if (!sceneResolved) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(
    sceneResolved.sceneJsonS3Key,
  );
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  let scenes = sceneJson.scenes;
  if (scope.targetSceneId !== undefined) {
    scenes = scenes.filter((scene) => scene.sceneId === scope.targetSceneId);
    if (scenes.length === 0) {
      throw new Error(`scene ${scope.targetSceneId} not found in sceneJson`);
    }
  }

  return {
    sceneJson,
    scenes,
  };
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

const persistImageCandidates = async (
  jobId: string,
  sceneId: number,
  assets: Record<string, unknown>[],
): Promise<void> => {
  for (const asset of assets) {
    const candidateId = asString(asset.candidateId);
    if (!candidateId) {
      continue;
    }
    await putSceneImageCandidate(jobId, sceneId, candidateId, {
      imageS3Key: asString(asset.imageS3Key),
      createdAt: asString(asset.createdAt) ?? new Date().toISOString(),
      provider: asString(asset.provider),
      providerLogS3Key: asString(asset.providerLogS3Key),
      promptHash: asString(asset.promptHash),
      mocked: asBoolean(asset.mocked),
      sourceUrl: asString(asset.sourceUrl),
      thumbnailUrl: asString(asset.thumbnailUrl),
      authorName: asString(asset.authorName),
      sourceAssetId: asString(asset.sourceAssetId),
      width: asNumber(asset.width),
      height: asNumber(asset.height),
    });
  }
};

const persistVideoCandidates = async (
  jobId: string,
  sceneId: number,
  assets: Record<string, unknown>[],
): Promise<void> => {
  for (const asset of assets) {
    const candidateId = asString(asset.candidateId);
    if (!candidateId) {
      continue;
    }
    await putSceneVideoCandidate(jobId, sceneId, candidateId, {
      videoClipS3Key: asString(asset.videoClipS3Key),
      createdAt: asString(asset.createdAt) ?? new Date().toISOString(),
      provider: asString(asset.provider),
      providerLogS3Key: asString(asset.providerLogS3Key),
      promptHash: asString(asset.promptHash),
      mocked: asBoolean(asset.mocked),
      sourceUrl: asString(asset.sourceUrl),
      thumbnailUrl: asString(asset.thumbnailUrl),
      authorName: asString(asset.authorName),
      sourceAssetId: asString(asset.sourceAssetId),
      width: asNumber(asset.width),
      height: asNumber(asset.height),
      durationSec: asNumber(asset.durationSec),
    });
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
  await persistImageCandidates(input.jobId, input.scene.sceneId, assets);
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
  await persistVideoCandidates(input.jobId, input.scene.sceneId, assets);
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

  const { sceneJson, scenes } = await loadSearchContext(parsed.jobId, scope);
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

  return getJobDraft(parsed.jobId);
};
