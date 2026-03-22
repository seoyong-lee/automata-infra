import {
  listSceneAssets,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import type { SceneJson } from "../../../../../types/render/scene-json";

const isNonEmptyS3Key = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/**
 * Admin 일괄 에셋 생성 완료 후, 씬별로 이미지·(조건부)영상·음성 키가 모두 있는지 검사한 뒤에만 ASSETS_READY로 올린다.
 * (음성 저장 콜백 순서만으로 READY를 올리지 않음)
 */
export const finalizeSceneAssetsReadiness = async (input: {
  jobId: string;
  sceneJson: SceneJson;
}): Promise<void> => {
  const rows = await listSceneAssets(input.jobId);
  const bySceneId = new Map(rows.map((r) => [r.sceneId, r]));
  const reasons: string[] = [];

  for (const scene of input.sceneJson.scenes) {
    const row = bySceneId.get(scene.sceneId);
    if (!row) {
      reasons.push(`scene ${scene.sceneId}: missing scene asset row`);
      continue;
    }
    if (!isNonEmptyS3Key(row.imageS3Key)) {
      reasons.push(`scene ${scene.sceneId}: image missing`);
    }
    if (!isNonEmptyS3Key(row.voiceS3Key)) {
      reasons.push(`scene ${scene.sceneId}: voice missing`);
    }
    const needsVideo = Boolean(scene.videoPrompt?.trim());
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
