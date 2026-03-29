import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import type { StockSearchScope } from "../normalize/stock-search-scope";

export type StockSearchPolicy = {
  allowImage: boolean;
  allowVideo: boolean;
};

export const loadStockSearchPolicy = async (
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

export const assertStockSearchAllowed = (
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
