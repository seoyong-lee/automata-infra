import { buildAssetPoolItem, putAssetPoolItem } from "./store/asset-pool";
import type {
  AssetPoolAssetType,
  AssetPoolItem,
  AssetPoolSourceType,
} from "./contracts/asset-pool";
import { deriveSceneAssetPoolTags } from "./scene-visual-needs";
import type { SceneDefinition } from "../../../types/render/scene-json";

export type SceneAssetPoolContext = Pick<SceneDefinition, "sceneId"> &
  Partial<SceneDefinition>;

const toSceneDefinition = (scene: SceneAssetPoolContext): SceneDefinition => {
  return {
    sceneId: scene.sceneId,
    durationSec: scene.durationSec ?? 4,
    narration: scene.narration ?? "",
    disableNarration: scene.disableNarration,
    imagePrompt: scene.imagePrompt ?? "scene image",
    videoPrompt: scene.videoPrompt,
    subtitle: scene.subtitle ?? scene.narration ?? "",
    bgmMood: scene.bgmMood,
    sfx: scene.sfx,
    storyBeat: scene.storyBeat,
    visualNeed: scene.visualNeed,
    startTransition: scene.startTransition,
  };
};

export const buildSceneAssetPoolItem = (input: {
  assetType: AssetPoolAssetType;
  sourceType: AssetPoolSourceType;
  storageKey: string;
  scene: SceneAssetPoolContext;
  provider?: string;
  thumbnailKey?: string;
  sourceUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  licenseType?: string;
  creatorName?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  containsPeople?: boolean;
  containsLogo?: boolean;
  containsText?: boolean;
  containsWatermark?: boolean;
  qualityScore?: number;
  reusabilityScore?: number;
  reviewStatus?: AssetPoolItem["reviewStatus"];
}): AssetPoolItem => {
  const scene = toSceneDefinition(input.scene);
  const { visualTags, moodTags } = deriveSceneAssetPoolTags(scene);

  return buildAssetPoolItem({
    assetType: input.assetType,
    sourceType: input.sourceType,
    provider: input.provider,
    storageKey: input.storageKey,
    thumbnailKey: input.thumbnailKey,
    sourceUrl: input.sourceUrl,
    durationSec: input.durationSec,
    width: input.width,
    height: input.height,
    visualTags,
    moodTags,
    containsPeople: input.containsPeople,
    containsLogo: input.containsLogo,
    containsText: input.containsText,
    containsWatermark: input.containsWatermark,
    qualityScore: input.qualityScore ?? 0.6,
    reusabilityScore: input.reusabilityScore ?? 0.55,
    licenseType: input.licenseType,
    creatorName: input.creatorName,
    attributionRequired: input.attributionRequired,
    commercialUseAllowed: input.commercialUseAllowed,
    reviewStatus: input.reviewStatus ?? "approved",
  });
};

export const registerSceneAssetPoolItem = async (input: {
  assetType: AssetPoolAssetType;
  sourceType: AssetPoolSourceType;
  storageKey: string;
  scene: SceneAssetPoolContext;
  provider?: string;
  thumbnailKey?: string;
  sourceUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  licenseType?: string;
  creatorName?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  containsPeople?: boolean;
  containsLogo?: boolean;
  containsText?: boolean;
  containsWatermark?: boolean;
  qualityScore?: number;
  reusabilityScore?: number;
  reviewStatus?: AssetPoolItem["reviewStatus"];
}): Promise<AssetPoolItem> => {
  return putAssetPoolItem({
    item: buildSceneAssetPoolItem(input),
  });
};
