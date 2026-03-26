import { putVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { mapVoiceProfile } from "../../../shared/mapper/map-voice-profile";

export const upsertVoiceProfile = async (input: {
  actor: string;
  profileId: string;
  label: string;
  provider: string;
  voiceId: string;
  modelId?: string;
  sampleAudioUrl?: string;
  description?: string;
  language?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  isActive: boolean;
}) => {
  const item = await putVoiceProfile(
    {
      profileId: input.profileId,
      label: input.label,
      provider: input.provider,
      voiceId: input.voiceId,
      modelId: input.modelId,
      sampleAudioUrl: input.sampleAudioUrl,
      description: input.description,
      language: input.language,
      speed: input.speed,
      stability: input.stability,
      similarityBoost: input.similarityBoost,
      style: input.style,
      useSpeakerBoost: input.useSpeakerBoost,
      isActive: input.isActive,
    },
    input.actor,
  );

  return mapVoiceProfile(item);
};
