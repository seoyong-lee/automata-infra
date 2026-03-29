import {
  getSceneAsset,
  type SceneVideoCandidateItem,
  putSceneVideoCandidate,
} from "../../../../shared/lib/store/video-jobs";
import { registerSceneAssetPoolItem } from "../../../../shared/lib/asset-pool-ingest";
import { materializeRemoteVideoAsset } from "../../../../shared/lib/providers/media";
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

const materializeVideoCandidateAsset = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneVideoCandidateItem;
}): Promise<string> => {
  if (
    typeof input.candidate.videoClipS3Key === "string" &&
    input.candidate.videoClipS3Key.length > 0
  ) {
    return input.candidate.videoClipS3Key;
  }
  if (!input.candidate.sourceUrl) {
    throw new Error("video candidate source url not found");
  }
  return materializeRemoteVideoAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidateId: input.candidate.candidateId,
    sourceUrl: input.candidate.sourceUrl,
  });
};

const ensureVideoPoolAssetId = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneVideoCandidateItem;
  videoClipS3Key: string;
}) => {
  if (input.candidate.assetPoolAssetId) {
    return input.candidate.assetPoolAssetId;
  }
  const sceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!sceneAsset) {
    return undefined;
  }
  const assetPoolItem = await registerSceneAssetPoolItem({
    assetType: "video",
    sourceType:
      input.candidate.candidateSource === "stock" ? "stock" : "internal",
    storageKey: input.videoClipS3Key,
    scene: toSceneDefinition({
      sceneId: input.sceneId,
      row: sceneAsset as Record<string, unknown>,
    }),
    provider: input.candidate.provider,
    thumbnailKey: input.candidate.thumbnailUrl,
    sourceUrl: input.candidate.sourceUrl,
    width: input.candidate.width,
    height: input.candidate.height,
    durationSec: input.candidate.durationSec,
    creatorName: input.candidate.authorName,
    qualityScore: 0.58,
    reusabilityScore: 0.6,
  });
  return assetPoolItem.assetId;
};

const persistResolvedVideoCandidate = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneVideoCandidateItem;
  videoClipS3Key: string;
  assetPoolAssetId?: string;
}) => {
  await putSceneVideoCandidate(
    input.jobId,
    input.sceneId,
    input.candidate.candidateId,
    {
      videoClipS3Key: input.videoClipS3Key,
      createdAt: input.candidate.createdAt,
      candidateSource: input.candidate.candidateSource,
      assetPoolAssetId: input.assetPoolAssetId,
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
      durationSec: input.candidate.durationSec,
    },
  );
};

export const resolveSelectedVideoS3Key = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneVideoCandidateItem | null;
}): Promise<string> => {
  const candidate = input.candidate;
  if (!candidate) {
    throw notFound("video candidate not found");
  }
  const videoClipS3Key = await materializeVideoCandidateAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
  });
  const assetPoolAssetId = await ensureVideoPoolAssetId({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
    videoClipS3Key,
  });
  await persistResolvedVideoCandidate({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
    videoClipS3Key,
    assetPoolAssetId,
  });
  return videoClipS3Key;
};
