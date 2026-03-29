import {
  putSceneImageCandidate,
  getSceneAsset,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import {
  searchAssetPoolByTags,
  type AssetPoolSearchHit,
} from "../../../../shared/lib/store/asset-pool";
import { deriveSceneAssetPoolTags } from "../../../../shared/lib/scene-visual-needs";
import type { SceneDefinition } from "../../../../../types/render/scene-json";

const AUTO_SELECT_MATCH_THRESHOLD = 0.45;

export const deriveScenePoolSearchTags = (scene: SceneDefinition): string[] => {
  const { visualTags, moodTags } = deriveSceneAssetPoolTags(scene);
  return Array.from(new Set([...visualTags, ...moodTags])).slice(0, 8);
};

const buildAvoidTagSet = (scene: SceneDefinition): Set<string> => {
  return new Set(
    (scene.visualNeed?.avoidTags ?? [])
      .map((value) =>
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
      )
      .filter((tag) => tag.length > 0),
  );
};

const countOverlap = (left: string[], right: string[]): number => {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const rightSet = new Set(right.map(normalize));
  return left
    .map(normalize)
    .filter((value) => value.length > 0)
    .filter((value) => rightSet.has(value)).length;
};

const computeRiskPenalty = (input: {
  scene: SceneDefinition;
  candidate: AssetPoolSearchHit;
}): number => {
  const avoid = buildAvoidTagSet(input.scene);
  let penalty = 0;
  if (avoid.has("logo") && input.candidate.containsLogo) {
    penalty += 0.4;
  }
  if (avoid.has("text") && input.candidate.containsText) {
    penalty += 0.3;
  }
  if (avoid.has("watermark") && input.candidate.containsWatermark) {
    penalty += 0.5;
  }
  return penalty;
};

export const scoreSceneImagePoolCandidate = (
  scene: SceneDefinition,
  candidate: AssetPoolSearchHit,
): number => {
  const semanticTags = (scene.visualNeed?.semanticType ?? "")
    .split("_")
    .filter((tag) => tag.length > 0);
  const semanticOverlap = Math.min(
    1,
    countOverlap(semanticTags, candidate.visualTags) /
      Math.max(1, semanticTags.length),
  );
  const moodTags = scene.visualNeed?.moodTags ?? [];
  const moodOverlap = Math.min(
    1,
    countOverlap(moodTags, candidate.moodTags) / Math.max(1, moodTags.length),
  );
  const qualityScore = candidate.qualityScore ?? 0.5;
  const reusabilityScore = candidate.reusabilityScore ?? 0.5;
  const tagMatchScore = Math.min(
    1,
    candidate.matchedTagCount /
      Math.max(1, semanticTags.length + moodTags.length),
  );
  const riskPenalty = computeRiskPenalty({ scene, candidate });

  return Number(
    (
      semanticOverlap * 0.35 +
      moodOverlap * 0.2 +
      qualityScore * 0.15 +
      reusabilityScore * 0.1 +
      tagMatchScore * 0.2 -
      riskPenalty
    ).toFixed(4),
  );
};

export const rankSceneImagePoolCandidates = (
  scene: SceneDefinition,
  candidates: AssetPoolSearchHit[],
): Array<AssetPoolSearchHit & { matchScore: number }> => {
  return candidates
    .map((candidate) => ({
      ...candidate,
      matchScore: scoreSceneImagePoolCandidate(scene, candidate),
    }))
    .filter((candidate) => candidate.matchScore > 0)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      return (
        (right.qualityScore ?? 0) +
        (right.reusabilityScore ?? 0) -
        ((left.qualityScore ?? 0) + (left.reusabilityScore ?? 0))
      );
    });
};

const shouldSearchPoolImages = (scene: SceneDefinition): boolean => {
  return scene.visualNeed?.visualTypePriority?.includes("pool_image") ?? false;
};

const persistRankedPoolImageCandidates = async (input: {
  jobId: string;
  sceneId: number;
  ranked: Array<AssetPoolSearchHit & { matchScore: number }>;
}): Promise<void> => {
  for (const candidate of input.ranked) {
    const candidateId = `pool-image-${candidate.assetId}`;
    await putSceneImageCandidate(input.jobId, input.sceneId, candidateId, {
      imageS3Key: candidate.storageKey,
      createdAt: candidate.ingestedAt,
      candidateSource: "pool",
      provider: candidate.provider,
      sourceUrl: candidate.sourceUrl,
      thumbnailUrl: candidate.thumbnailKey,
      authorName: candidate.creatorName,
      sourceAssetId: candidate.assetId,
      assetPoolAssetId: candidate.assetId,
      width: candidate.width,
      height: candidate.height,
      matchScore: candidate.matchScore,
      licenseType: candidate.licenseType,
      attributionRequired: candidate.attributionRequired,
      commercialUseAllowed: candidate.commercialUseAllowed,
    });
  }
};

const autoSelectBestPoolImageCandidate = async (input: {
  jobId: string;
  sceneId: number;
  existingImageS3Key?: string;
  best?: AssetPoolSearchHit & { matchScore: number };
}): Promise<void> => {
  if (
    !input.best ||
    input.existingImageS3Key ||
    input.best.matchScore < AUTO_SELECT_MATCH_THRESHOLD
  ) {
    return;
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    imageS3Key: input.best.storageKey,
    imageSelectedCandidateId: `pool-image-${input.best.assetId}`,
    imageProvider: input.best.provider ?? "asset-pool",
    imageSelectedAt: new Date().toISOString(),
    imageSelectionSource: "pool",
    imageAssetId: input.best.assetId,
    imageMatchScore: input.best.matchScore,
  });
};

export const resolveSceneImagePoolAssets = async (
  jobId: string,
  scenes: SceneDefinition[],
  deps: {
    searchPoolImages?: (input: {
      tags: string[];
      limitPerTag?: number;
    }) => Promise<AssetPoolSearchHit[]>;
  } = {},
): Promise<void> => {
  const searchPoolImages =
    deps.searchPoolImages ??
    ((input: { tags: string[]; limitPerTag?: number }) =>
      searchAssetPoolByTags({
        assetType: "image",
        tags: input.tags,
        limitPerTag: input.limitPerTag,
      }));

  for (const scene of scenes) {
    if (!shouldSearchPoolImages(scene)) {
      continue;
    }

    const existing = await getSceneAsset(jobId, scene.sceneId);
    const existingImageS3Key =
      typeof existing?.imageS3Key === "string" && existing.imageS3Key.length > 0
        ? existing.imageS3Key
        : undefined;
    const tags = deriveScenePoolSearchTags(scene);
    if (tags.length === 0) {
      continue;
    }

    const ranked = rankSceneImagePoolCandidates(
      scene,
      await searchPoolImages({ tags, limitPerTag: 12 }),
    ).slice(0, 5);

    await persistRankedPoolImageCandidates({
      jobId,
      sceneId: scene.sceneId,
      ranked,
    });
    await autoSelectBestPoolImageCandidate({
      jobId,
      sceneId: scene.sceneId,
      existingImageS3Key,
      best: ranked[0],
    });
  }
};
