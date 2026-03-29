import {
  searchPexelsPhotoCandidates,
  searchPexelsVideoCandidates,
} from "../../../../../shared/lib/providers/media";

export type SearchStockImageFn = typeof searchPexelsPhotoCandidates;
export type SearchStockVideoFn = typeof searchPexelsVideoCandidates;
