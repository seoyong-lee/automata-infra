import {
  getSceneAsset,
  type SceneImageCandidateItem,
  putSceneImageCandidate,
} from "../../../../shared/lib/store/video-jobs";
import { registerSceneAssetPoolItem } from "../../../../shared/lib/asset-pool-ingest";
import { materializeRemoteImageAsset } from "../../../../shared/lib/providers/media";
import type { SceneDefinition } from "../../../../../types/render/scene-json";
import { notFound } from "../../../shared/errors";

const toSceneDefinition = (input: {
  sceneId: number;
  row: Record<string, unknown>;
}): SceneDefinition => {
  return {
    sceneId: input.sceneId,
    durationSec:
      typeof input.row.durationSec === "number" ? input.row.durationSec : 4,
    narration:
      typeof input.row.narration === "string" ? input.row.narration : "",
    disableNarration:
      typeof input.row.disableNarration === "boolean"
        ? input.row.disableNarration
        : undefined,
    imagePrompt:
      typeof input.row.imagePrompt === "string"
        ? input.row.imagePrompt
        : "scene image",
    videoPrompt:
      typeof input.row.videoPrompt === "string"
        ? input.row.videoPrompt
        : undefined,
    subtitle: typeof input.row.subtitle === "string" ? input.row.subtitle : "",
    storyBeat:
      typeof input.row.storyBeat === "string" ? input.row.storyBeat : undefined,
    visualNeed:
      input.row.visualNeed && typeof input.row.visualNeed === "object"
        ? (input.row.visualNeed as SceneDefinition["visualNeed"])
        : undefined,
  };
};

const materializeImageCandidateAsset = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneImageCandidateItem;
}): Promise<string> => {
  if (
    typeof input.candidate.imageS3Key === "string" &&
    input.candidate.imageS3Key.length > 0
  ) {
    return input.candidate.imageS3Key;
  }
  if (!input.candidate.sourceUrl) {
    throw new Error("image candidate source url not found");
  }
  return materializeRemoteImageAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidateId: input.candidate.candidateId,
    sourceUrl: input.candidate.sourceUrl,
  });
};

const ensureImagePoolAssetId = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneImageCandidateItem;
  imageS3Key: string;
}) => {
  if (input.candidate.assetPoolAssetId) {
    return input.candidate.assetPoolAssetId;
  }
  const sceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!sceneAsset) {
    return undefined;
  }
  const assetPoolItem = await registerSceneAssetPoolItem({
    assetType: "image",
    sourceType:
      input.candidate.candidateSource === "stock" ? "stock" : "internal",
    storageKey: input.imageS3Key,
    scene: toSceneDefinition({
      sceneId: input.sceneId,
      row: sceneAsset as Record<string, unknown>,
    }),
    provider: input.candidate.provider,
    thumbnailKey: input.candidate.thumbnailUrl,
    sourceUrl: input.candidate.sourceUrl,
    width: input.candidate.width,
    height: input.candidate.height,
    creatorName: input.candidate.authorName,
    qualityScore: 0.58,
    reusabilityScore: 0.6,
  });
  return assetPoolItem.assetId;
};

const persistResolvedImageCandidate = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneImageCandidateItem;
  imageS3Key: string;
  assetPoolAssetId?: string;
}) => {
  await putSceneImageCandidate(
    input.jobId,
    input.sceneId,
    input.candidate.candidateId,
    {
      imageS3Key: input.imageS3Key,
      createdAt: input.candidate.createdAt,
      candidateSource: input.candidate.candidateSource,
      assetPoolAssetId: input.assetPoolAssetId,
      matchScore: input.candidate.matchScore,
      provider: input.candidate.provider,
      providerLogS3Key: input.candidate.providerLogS3Key,
      promptHash: input.candidate.promptHash,
      mocked: input.candidate.mocked,
      sourceUrl: input.candidate.sourceUrl,
      thumbnailUrl: input.candidate.thumbnailUrl,
      authorName: input.candidate.authorName,
      sourceAssetId: input.candidate.sourceAssetId,
      licenseType: input.candidate.licenseType,
      attributionRequired: input.candidate.attributionRequired,
      commercialUseAllowed: input.candidate.commercialUseAllowed,
      width: input.candidate.width,
      height: input.candidate.height,
    },
  );
};

export const resolveSelectedImageS3Key = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneImageCandidateItem | null;
}): Promise<string> => {
  const candidate = input.candidate;
  if (!candidate) {
    throw notFound("image candidate not found");
  }
  const imageS3Key = await materializeImageCandidateAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
  });
  const assetPoolAssetId = await ensureImagePoolAssetId({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
    imageS3Key,
  });
  await persistResolvedImageCandidate({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
    imageS3Key,
    assetPoolAssetId,
  });
  return imageS3Key;
};
