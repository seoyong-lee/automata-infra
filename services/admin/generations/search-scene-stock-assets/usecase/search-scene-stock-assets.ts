import { upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import {
  searchPexelsPhotoCandidates,
  searchPexelsVideoCandidates,
} from "../../../../shared/lib/providers/media";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { loadStockSearchContext } from "../repo/load-stock-search-context";
import {
  assertStockSearchAllowed,
  loadStockSearchPolicy,
} from "../repo/load-stock-search-policy";
import { toStockSearchScope } from "../normalize/stock-search-scope";
import type { SearchSceneStockAssetsInputDto } from "../normalize/parse-search-scene-stock-assets-args";
import { searchImageCandidatesAcrossScenes } from "./policies/search-image-candidates-across-scenes";
import { searchVideoCandidatesAcrossScenes } from "./policies/search-video-candidates-across-scenes";
import type {
  SearchStockImageFn,
  SearchStockVideoFn,
} from "./policies/stock-search-types";

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

  const pexelsQueryOverride = parsed.query;

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
      pexelsQueryOverride,
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
      pexelsQueryOverride,
    });
  }

  return getJobDraftView(parsed.jobId);
};
