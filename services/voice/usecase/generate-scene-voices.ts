import {
  adjustVoiceWithFargate,
  generateSceneVoice,
} from "../../shared/lib/providers/media";
import type { ElevenLabsVoiceSettings } from "../../shared/lib/providers/media/elevenlabs-voice";

type VoiceAsset = Record<string, unknown>;

type GenerateSceneVoiceFn = typeof generateSceneVoice;
type AdjustVoiceWithFargateFn = typeof adjustVoiceWithFargate;
const VOICE_DURATION_TOLERANCE_SEC = 0.05;

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const shouldPostProcessVoice = (input: {
  asset: Record<string, unknown>;
  targetDurationSec: number;
}): boolean => {
  const durationSec = asNumber(input.asset.durationSec);
  const voiceS3Key = asString(input.asset.voiceS3Key);
  const mocked = input.asset.mocked === true;
  return Boolean(
    !mocked &&
    voiceS3Key &&
    durationSec &&
    durationSec > input.targetDurationSec + VOICE_DURATION_TOLERANCE_SEC,
  );
};

const maybePostProcessVoiceAsset = async (input: {
  jobId: string;
  sceneId: number;
  targetDurationSec: number;
  asset: Record<string, unknown>;
  adjustVoice?: AdjustVoiceWithFargateFn;
}): Promise<Record<string, unknown>> => {
  if (
    !input.adjustVoice ||
    !shouldPostProcessVoice({
      asset: input.asset,
      targetDurationSec: input.targetDurationSec,
    })
  ) {
    return input.asset;
  }
  const voiceS3Key = asString(input.asset.voiceS3Key);
  const candidateId = asString(input.asset.candidateId);
  const durationSec = asNumber(input.asset.durationSec);
  if (!voiceS3Key || !candidateId || durationSec === undefined) {
    return input.asset;
  }
  const extension = voiceS3Key.split(".").pop()?.trim() || "mp3";
  const outputVoiceS3Key = `assets/${input.jobId}/tts/scene-${input.sceneId}/${candidateId}-adjusted.${extension}`;
  const adjusted = await input.adjustVoice({
    jobId: input.jobId,
    sceneId: input.sceneId,
    inputVoiceS3Key: voiceS3Key,
    outputVoiceS3Key,
    targetDurationSec: input.targetDurationSec,
    inputDurationSec: durationSec,
  });
  return {
    ...input.asset,
    voiceS3Key: adjusted.voiceS3Key,
    durationSec: adjusted.durationSec,
    postProcessed: true,
    postProcessProvider: adjusted.provider,
    postProcessRenderId: adjusted.providerRenderId,
  };
};

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
    adjustVoiceWithFargate?: AdjustVoiceWithFargateFn;
  } = {},
): Promise<VoiceAsset[]> => {
  const voiceAssets: VoiceAsset[] = [];
  const requestSceneVoice = deps.generateSceneVoice ?? generateSceneVoice;
  const adjustVoice = deps.adjustVoiceWithFargate ?? adjustVoiceWithFargate;
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
    const finalAsset = await maybePostProcessVoiceAsset({
      jobId: input.jobId,
      sceneId: scene.sceneId,
      targetDurationSec: scene.durationSec,
      asset,
      adjustVoice,
    });

    voiceAssets.push({
      ...finalAsset,
    });
  }

  return voiceAssets;
};
