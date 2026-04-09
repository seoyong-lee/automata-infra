import { generateSceneVoice } from "../../shared/lib/providers/media";
import type { ElevenLabsVoiceSettings } from "../../shared/lib/providers/media/elevenlabs-voice";

type VoiceAsset = Record<string, unknown>;

type GenerateSceneVoiceFn = typeof generateSceneVoice;

export const generateSceneVoices = async (
  input: {
    jobId: string;
    scenes: Array<{
      sceneId: number;
      narration: string;
      disableNarration?: boolean;
      durationSec: number;
      voiceProfileId?: string;
      voiceId?: string;
      modelId?: string;
      voiceSettings?: ElevenLabsVoiceSettings;
    }>;
    secretId: string;
  },
  deps: {
    generateSceneVoice?: GenerateSceneVoiceFn;
  } = {},
): Promise<VoiceAsset[]> => {
  const voiceAssets: VoiceAsset[] = [];
  const requestSceneVoice = deps.generateSceneVoice ?? generateSceneVoice;
  const scenesWithNarration = input.scenes.filter(
    (scene) => !scene.disableNarration && scene.narration.trim().length > 0,
  );

  for (const scene of scenesWithNarration) {
    const asset = await requestSceneVoice({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      text: scene.narration,
      secretId: input.secretId,
      targetDurationSec: scene.durationSec,
      voiceProfileId: scene.voiceProfileId,
      voiceId: scene.voiceId,
      modelId: scene.modelId,
      voiceSettings: scene.voiceSettings,
    });
    voiceAssets.push(asset);
  }

  return voiceAssets;
};
