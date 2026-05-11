import {
  listSceneAssets,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import { sceneHasAiVideoTextPrompt } from "../../../../shared/lib/resolve-scene-ai-video-prompt";
import type { SceneJson } from "../../../../../types/render/scene-json";
import { loadAssetGenerationPolicy } from "../repo/load-asset-generation-policy";

const isNonEmptyS3Key = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/**
 * Admin 일괄 에셋 생성 완료 후, 씬 행 존재 및 (정책상 필요 시) 영상만 검사한 뒤 ASSETS_READY로 올린다.
 * 이미지·음성 없이도 최종 렌더(솔리드/무음 폴백) 가능하므로 필수로 두지 않음.
 */
export const finalizeSceneAssetsReadiness = async (input: {
  jobId: string;
  sceneJson: SceneJson;
}): Promise<void> => {
  const policy = await loadAssetGenerationPolicy(input.jobId);
  const rows = await listSceneAssets(input.jobId);
  const bySceneId = new Map(rows.map((r) => [r.sceneId, r]));
  const reasons: string[] = [];

  for (const scene of input.sceneJson.scenes) {
    const row = bySceneId.get(scene.sceneId);
    if (!row) {
      reasons.push(`scene ${scene.sceneId}: missing scene asset row`);
      continue;
    }
    const needsVideo = policy.allowVideo && sceneHasAiVideoTextPrompt(scene);
    if (needsVideo && !isNonEmptyS3Key(row.videoClipS3Key)) {
      reasons.push(`scene ${scene.sceneId}: video missing`);
    }
  }

  if (reasons.length > 0) {
    const msg = reasons.join("; ");
    await updateJobMeta(input.jobId, { lastError: msg }, "FAILED");
    throw new Error(`asset generation incomplete: ${msg}`);
  }

  await updateJobMeta(input.jobId, { lastError: null }, "ASSETS_READY");
};

/**
 * 부분 재생성 후: 씬 행·조건부 영상만 검사. 이미지·음성 없음은 ASSETS_READY 허용.
 * (throw 없음 — 부분 실행 파이프라인용)
 */
export const recomputeSceneAssetsReadiness = async (input: {
  jobId: string;
  sceneJson: SceneJson;
}): Promise<void> => {
  const policy = await loadAssetGenerationPolicy(input.jobId);
  const rows = await listSceneAssets(input.jobId);
  const bySceneId = new Map(rows.map((r) => [r.sceneId, r]));
  const reasons: string[] = [];

  for (const scene of input.sceneJson.scenes) {
    const row = bySceneId.get(scene.sceneId);
    if (!row) {
      reasons.push(`scene ${scene.sceneId}: missing scene asset row`);
      continue;
    }
    const needsVideo = policy.allowVideo && sceneHasAiVideoTextPrompt(scene);
    if (needsVideo && !isNonEmptyS3Key(row.videoClipS3Key)) {
      reasons.push(`scene ${scene.sceneId}: video missing`);
    }
  }

  if (reasons.length > 0) {
    const msg = reasons.join("; ");
    await updateJobMeta(input.jobId, { lastError: msg }, "ASSET_GENERATING");
    return;
  }

  await updateJobMeta(input.jobId, { lastError: null }, "ASSETS_READY");
};
