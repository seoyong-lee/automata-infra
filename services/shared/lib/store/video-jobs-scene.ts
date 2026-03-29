import {
  type SceneAssetItem,
  type SceneImageCandidateItem,
  type SceneVideoCandidateItem,
  type SceneVoiceCandidateItem,
} from "./video-jobs-shared";
import {
  getJobScopedItem,
  getSceneCandidateItem,
  listJobScopedItems,
  listSceneCandidateItems,
  putJobScopedItem,
  putSceneCandidateItem,
} from "./video-jobs-helpers";

export const putSceneAsset = async (
  jobId: string,
  sceneId: number,
  item: Record<string, unknown>,
): Promise<void> => {
  await putJobScopedItem(jobId, `SCENE#${sceneId}`, {
    sceneId,
    ...item,
  });
};

export const getSceneAsset = async (
  jobId: string,
  sceneId: number,
): Promise<SceneAssetItem | null> => {
  return getJobScopedItem<SceneAssetItem>(jobId, `SCENE#${sceneId}`);
};

export const upsertSceneAsset = async (
  jobId: string,
  sceneId: number,
  item: Record<string, unknown>,
): Promise<void> => {
  const current = await getSceneAsset(jobId, sceneId);

  await putJobScopedItem(jobId, `SCENE#${sceneId}`, {
    ...(current ?? {
      sceneId,
    }),
    ...item,
  });
};

export const putSceneImageCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
  item: Omit<SceneImageCandidateItem, "PK" | "SK" | "sceneId" | "candidateId">,
): Promise<void> => {
  await putSceneCandidateItem({
    jobId,
    sceneId,
    candidateId,
    kind: "IMAGE_CANDIDATE",
    item,
  });
};

export const getSceneImageCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
): Promise<SceneImageCandidateItem | null> => {
  return getSceneCandidateItem<SceneImageCandidateItem>({
    jobId,
    sceneId,
    candidateId,
    kind: "IMAGE_CANDIDATE",
  });
};

export const listSceneImageCandidates = async (
  jobId: string,
  sceneId: number,
): Promise<SceneImageCandidateItem[]> => {
  return listSceneCandidateItems<SceneImageCandidateItem>({
    jobId,
    sceneId,
    kind: "IMAGE_CANDIDATE",
  });
};

export const putSceneVideoCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
  item: Omit<SceneVideoCandidateItem, "PK" | "SK" | "sceneId" | "candidateId">,
): Promise<void> => {
  await putSceneCandidateItem({
    jobId,
    sceneId,
    candidateId,
    kind: "VIDEO_CANDIDATE",
    item,
  });
};

export const getSceneVideoCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
): Promise<SceneVideoCandidateItem | null> => {
  return getSceneCandidateItem<SceneVideoCandidateItem>({
    jobId,
    sceneId,
    candidateId,
    kind: "VIDEO_CANDIDATE",
  });
};

export const listSceneVideoCandidates = async (
  jobId: string,
  sceneId: number,
): Promise<SceneVideoCandidateItem[]> => {
  return listSceneCandidateItems<SceneVideoCandidateItem>({
    jobId,
    sceneId,
    kind: "VIDEO_CANDIDATE",
  });
};

export const putSceneVoiceCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
  item: Omit<SceneVoiceCandidateItem, "PK" | "SK" | "sceneId" | "candidateId">,
): Promise<void> => {
  await putSceneCandidateItem({
    jobId,
    sceneId,
    candidateId,
    kind: "VOICE_CANDIDATE",
    item,
  });
};

export const getSceneVoiceCandidate = async (
  jobId: string,
  sceneId: number,
  candidateId: string,
): Promise<SceneVoiceCandidateItem | null> => {
  return getSceneCandidateItem<SceneVoiceCandidateItem>({
    jobId,
    sceneId,
    candidateId,
    kind: "VOICE_CANDIDATE",
  });
};

export const listSceneVoiceCandidates = async (
  jobId: string,
  sceneId: number,
): Promise<SceneVoiceCandidateItem[]> => {
  return listSceneCandidateItems<SceneVoiceCandidateItem>({
    jobId,
    sceneId,
    kind: "VOICE_CANDIDATE",
  });
};

export const listSceneAssets = async (
  jobId: string,
): Promise<SceneAssetItem[]> => {
  const items = await listJobScopedItems<SceneAssetItem>({
    jobId,
    skPrefix: "SCENE#",
    scanIndexForward: true,
    limit: 100,
  });

  return items
    .filter((item) => /^SCENE#\d+$/.test(item.SK))
    .sort((left, right) => left.sceneId - right.sceneId);
};
