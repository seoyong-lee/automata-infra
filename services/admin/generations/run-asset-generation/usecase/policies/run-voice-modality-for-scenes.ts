import { generateSceneVoices } from "../../../../../voice/usecase/generate-scene-voices";
import { buildVoiceScenesForJob } from "../../../../../voice/usecase/build-voice-scenes-for-job";
import { saveVoiceAssets } from "../../../../../voice/repo/save-voice-assets";
import { notFound } from "../../../../shared/errors";
import { getJobOrThrow } from "../../../../shared/repo/job-draft-store";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";

export const runVoiceModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
  options?: { runVoiceProfileIdOverride?: string },
) => {
  const job = await getJobOrThrow(jobId);
  let voiceScenes;
  try {
    voiceScenes = await buildVoiceScenesForJob({
      jobId,
      job,
      scenes,
      runVoiceProfileIdOverride: options?.runVoiceProfileIdOverride,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("voice profile not found:")) {
      throw notFound(message);
    }
    throw error;
  }
  const voiceAssets = await generateSceneVoices({
    jobId,
    scenes: voiceScenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId,
    scenes: voiceScenes,
    voiceAssets,
    markStatus: false,
  });
};
