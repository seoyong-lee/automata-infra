import { generateSceneVoice } from "../../shared/lib/providers/media/elevenlabs-voice";

export const generateSceneVoices = async (input: {
  jobId: string;
  scenes: Array<{
    sceneId: number;
    narration: string;
    durationSec: number;
  }>;
  secretId: string;
}): Promise<unknown[]> => {
  const voiceAssets = [];

  for (const scene of input.scenes) {
    const asset = await generateSceneVoice({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      text: scene.narration,
      secretId: input.secretId,
    });

    voiceAssets.push({
      ...asset,
      durationSec: scene.durationSec,
    });
  }

  return voiceAssets;
};
