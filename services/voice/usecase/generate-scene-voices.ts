import { generateSceneVoice } from "../../shared/lib/providers/media/elevenlabs-voice";

type VoiceAsset = Record<string, unknown>;

type GenerateSceneVoiceFn = typeof generateSceneVoice;

export const generateSceneVoices = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      narration: string;
      durationSec: number;
    }>;
    secretId: string;
  },
  deps: {
    generateSceneVoice?: GenerateSceneVoiceFn;
  } = {},
): Promise<VoiceAsset[]> => {
  const voiceAssets: VoiceAsset[] = [];
  const requestSceneVoice = deps.generateSceneVoice ?? generateSceneVoice;

  for (const scene of input.scenes) {
    const asset = await requestSceneVoice({
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
