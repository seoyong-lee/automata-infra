import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { generateSceneImages } from "../../../../image/usecase/generate-scene-images";
import { saveImageAssets } from "../../../../image/repo/save-image-assets";
import { generateSceneVideos } from "../../../../video-generation/usecase/generate-scene-videos";
import { saveVideoAssets } from "../../../../video-generation/repo/save-video-assets";
import { generateSceneVoices } from "../../../../voice/usecase/generate-scene-voices";
import { saveVoiceAssets } from "../../../../voice/repo/save-voice-assets";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import type { SceneJson } from "../../../../../types/render/scene-json";

export const runAdminAssetGeneration = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  if (!job.sceneJsonS3Key) {
    throw new Error("scene json not found");
  }
  const sceneJson = await getJsonFromS3<SceneJson>(job.sceneJsonS3Key);
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  await updateJobMeta(jobId, {}, "ASSET_GENERATING");
  const imageScenes = sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    imagePrompt: scene.imagePrompt,
  }));
  const imageAssets = await generateSceneImages({
    jobId,
    scenes: imageScenes,
    secretId: process.env.OPENAI_SECRET_ID ?? "",
  });
  await saveImageAssets({
    jobId,
    scenes: imageScenes,
    imageAssets,
    markStatus: false,
  });

  const videoScenes = sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    videoPrompt: scene.videoPrompt,
  }));
  const videoAssets = await generateSceneVideos({
    jobId,
    scenes: videoScenes,
    secretId: process.env.RUNWAY_SECRET_ID ?? "",
  });
  await saveVideoAssets({
    jobId,
    scenes: videoScenes,
    videoAssets,
  });

  const voiceScenes = sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    narration: scene.narration,
    durationSec: scene.durationSec,
  }));
  const voiceAssets = await generateSceneVoices({
    jobId,
    scenes: voiceScenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId,
    scenes: voiceScenes,
    voiceAssets,
    markStatus: true,
  });

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};
